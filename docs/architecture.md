# MahaSwasthya Grid — System Architecture & Design

## 1. System Overview

**MahaSwasthya Grid** is an offline-first, geospatial health network operating across Mumbai Suburban district (focusing on the R/South, P/North, and R/Central wards: Kandivali, Borivali, Malad, Goregaon). It addresses three critical challenges in urban public healthcare:
1. **Unbalanced Patient Load**: Overcrowding at secondary/tertiary hospitals while primary urban health posts (UPHCs) remain underutilized.
2. **Disconnected Referrals**: Patients lost between primary referral and secondary specialist consultation due to paper slips.
3. **Data Quality & Interoperability Deficits**: Errors in National Health Facility Registry (HFR) datasets (e.g. invalid closing hours such as `17:93` or missing coordinates).

```
+-------------------------------------------------------------------------------+
|                             MahaSwasthya Frontends                           |
|  - Citizen Portal (Next.js PWA)                                              |
|  - Frontline Worker Desk (Offline-First Dexie / IndexedDB)                    |
|  - Facility Admin / Doctor Station (Live Queue & Referrals)                   |
|  - District Command Center (GIS OpenStreetMap & Recharts)                    |
+-------------------------------------------------------------------------------+
                                      |
                                      | REST / JSON / SSE
                                      v
+-------------------------------------------------------------------------------+
|                         Modular Monolith API Gateway                          |
|  Express.js 5 / TypeScript / Rate Limiter / Audit Middleware / Helmet / CORS  |
+-------------------------------------------------------------------------------+
       |                   |                   |                   |
       v                   v                   v                   v
+--------------+    +--------------+    +--------------+    +--------------+
| Care Router  |    | Triage Engine|    | Referral MS  |    | Data Quality |
| 100-pt Score |    | CDSS Rules   |    | 8-Step State |    | Anomaly Svc  |
+--------------+    +--------------+    +--------------+    +--------------+
       |                   |                   |                   |
       +-------------------+-------------------+-------------------+
                                      |
                 +--------------------+--------------------+
                 |                                         |
                 v                                         v
+---------------------------------+       +---------------------------------+
|      PostgreSQL 17 + PostGIS    |       |             Redis 7             |
| - 26 Normalized Prisma Models   |       | - BullMQ Worker Queues          |
| - GiST Spatial Point Indexes    |       | - Distributed OPD Queues        |
| - ST_DWithin / Haversine Queries|       | - Session / Token Blacklist     |
+---------------------------------+       +---------------------------------+
```

---

## 2. Core Architectural Principles

### 2.1 Modular Monolith
The backend is structured into domain modules under `backend/src/modules/`:
- `auth`: JWT token pairs, mock OTP generator, deterministic demo persona impersonation.
- `facilities`: Registry search, nearby spatial lookup, diagnostics inventory.
- `care-routing`: Multi-criteria weighted algorithmic ranking (Distance 35%, Wait time 25%, Specialty 20%, Hours 10%, Quality 10%).
- `triage`: Vital signs assessment, syndromic red-flag heuristics, CDSS advisory generation.
- `referrals`: 8-step deterministic finite state machine (`REQUESTED` -> `ACCEPTED` -> `DISPATCHED` -> `ARRIVED` -> `IN_CONSULTATION` -> `COMPLETED`).
- `queues`: Live token dispensing, doctor consultation flow, wait-time prediction.
- `sync`: Idempotent offline mutation queue push, conflict resolution, device tracking.
- `data-quality`: Automated validation of HFR source data, issue logging, quality score recalculation.
- `demo`: Clean state reset, synthetic data generation with strict `demoData: true` lineage tags.

### 2.2 Offline-First Architecture (Frontline Edge)
Field workers (ASHA/ANM) frequently encounter network dropouts in slum settlements:
- **Client Storage**: Dexie.js (IndexedDB wrapper) caches facility catalogues, patient drafts, and staged operations (`OfflineSyncQueueItem`).
- **Idempotent Sync Protocol**: Client operations generate deterministic UUIDs (`operationId`). When connectivity is restored, the `SyncManager` flushes pending batches to `/api/v1/sync/push`.
- **Conflict Handling**: Last-Write-Wins with server-side validation. If a record was modified concurrently, a `CONFLICT` status is logged and made inspectable in the Sync Center.

### 2.3 PostGIS Geospatial Engine
- Point coordinates are stored as both float fields (`latitude`, `longitude`) and PostGIS `geography(Point, 4326)`.
- Facilities are indexed with GiST (`USING GIST (location)`).
- Queries utilize `ST_DWithin` for bounding radius calculations and `ST_Distance` for accurate geodesic distances in meters.
- Offline fallback leverages the Haversine trigonometric formula bundled within `frontend/lib/offline/facility-repository.ts`.

---

## 3. Technology Stack

| Layer | Component | Version / Image | Rationale |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL + PostGIS | `postgis/postgis:17-3.5` | Spatial geocoding, relational consistency, transaction isolation |
| **Cache & Queue** | Redis | `redis:7-alpine` | Fast queue state, BullMQ background job orchestrator |
| **Backend API** | Node.js / Express 5 | Node 20 / TypeScript | Modular monolith, typed request-response cycles |
| **ORM** | Prisma ORM | 5.22+ | Type-safe queries, migration lineage, raw PostGIS integration |
| **Frontend** | Next.js 14 (App Router) | Next 14.2 / React 18 | Standalone SSR/PWA build, Tailwind CSS, Lucide icons |
| **GIS Mapping** | Leaflet / OpenStreetMap | Leaflet 1.9+ | Zero API keys required, custom SVG pin markers |
| **Client DB** | Dexie.js | 4.0+ | IndexedDB persistence for offline drafts & mutations |
| **Containerization**| Docker Compose | v2+ | 1-command startup, isolated networking, healthy healthchecks |
