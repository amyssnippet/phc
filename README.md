# SwasthyaSetu (स्वास्थ्यसेतु)

> **SIH26133 Prototype** — Offline-First Geospatial Health Navigation, Multi-PHC Atomic Queue Management, Algorithmic Care Routing, and Closed-Loop Referral Ecosystem for Urban Maharashtra.

[![Docker Compose](https://img.shields.io/badge/Docker-Compose_v2-2496ED?logo=docker&logoColor=white)](#docker-compose-quickstart)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-PostGIS_3.5-336791?logo=postgresql&logoColor=white)](#geospatial-engine)
[![Next.js](https://img.shields.io/badge/Next.js_14-App_Router-000000?logo=next.js&logoColor=white)](#frontend-architecture)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](#technology-stack)
[![Security Tested](https://img.shields.io/badge/Security-IDOR_Protected-success?logo=shield)](backend/tests/integration/security-isolation.test.ts)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)

---

## Highlights & Key Innovations

1. **Dual Specialized Application Shells**:
   - **Citizen Web App (`/citizen/*`)**: Mobile-first responsive UI with bottom navigation, fast appointment booking, atomic queue token allocation with live wait-time estimate, care timeline, and bilingual (English / Marathi / Hindi) support.
   - **Unified Workforce Portal (`/portal/*`)**: Scoped role-based sidebar console providing live OPD queues with chamber call controls, patient directory with local draft support, syndromic CDSS triage, referral desk (accept/reject), and district data quality governance.

2. **Atomic Multi-PHC OPD Queue System (`QueueCounter`)**:
   - Transactional, race-condition-safe sequential token generator using PostgreSQL row-level locking.
   - Department-specific prefixes (e.g., `GM-001` for General Medicine, `PED-001` for Pediatrics).
   - Verified under high concurrency: 20 simultaneous walk-in allocations produce 20 distinct sequential tokens with zero gaps, zero duplicates, and complete multi-facility isolation.

3. **Strict Zero-Trust Role Security Isolation & IDOR Blocking**:
   - Explicitly partitioned REST APIs (`/api/v1/me`, `/api/v1/worker`, `/api/v1/doctor`, `/api/v1/facility`, `/api/v1/district`).
   - Doctors and facility staff can only access clinical records and call queues for their assigned facilities.
   - Citizens cannot access other patients' medical records or practitioner phone numbers.
   - Client-side persona switcher clears all React Query cache data to prevent cross-session leakage.

4. **Deterministic 100-Point Algorithmic Care Router**:
   Distributes patient load away from crowded tertiary hospitals to equipped Urban Primary Health Centres (UPHCs) using multi-criteria weighted scoring:
   - **Distance**: 35% (PostGIS geodesic distance)
   - **OPD Queue Wait Time**: 25% (Live token load)
   - **Clinical Capability & Tier**: 20% (Emergency vs General OPD)
   - **Operating Hours**: 10% (Open now vs closing soon)
   - **Facility Data Quality**: 10% (Registry reliability)

5. **Offline-First Frontline Worker (CHW / ASHA) Desk**:
   - Built on **Dexie / IndexedDB** for 100% functionality without internet.
   - Point-of-care patient registration with local draft generation.
   - Syndromic triage with vital signs input and **Clinical Decision Support (CDSS)** safety rules.
   - Idempotent batch push to `/api/v1/sync/push` with conflict resolution.

6. **Closed-Loop Referral Lifecycle**:
   - Eliminates lost paper slips between primary health posts and secondary hospitals.
   - Deterministic lifecycle: `CREATED` &rarr; `ACCEPTED` &rarr; `IN_CONSULTATION` &rarr; `COMPLETED`.
   - Complete milestone audit timeline accessible by both citizen and clinician.

7. **Real HFR Source Ingestion & Data Quality Engine**:
   - Ingests all 50 Urban Primary Health Centres & Secondary Facilities across Mumbai Suburban district (`mumbai-suburban.json`).
   - Automatically detects erroneous government records (e.g. invalid close times `17:93` in DDU2 RCH UPHC and `17:73` in Dindoshi Vasahat UPHC).
   - Generates sanitized public registry (`mumbai-suburban.public.json`) stripping personal officer contacts to comply with DPDP Act 2023.

---

## Technology Stack

- **Frontend & Mobile**: Next.js 14 (App Router, Standalone & Static Export), React 18, Capacitor 7 Android Native Shell, Tailwind CSS, Lucide Icons, Recharts, Leaflet, Dexie.js (IndexedDB).
- **Backend**: Node.js 20, Express 5, TypeScript, Prisma ORM, BullMQ, Redis 7, Winston logger.
- **Database & Spatial**: PostgreSQL 17 with PostGIS 3.5 extension (`postgis/postgis:17-3.5`).
- **DevOps & Mobile Build**: Multi-stage Dockerfiles, Docker Compose, Containerized Android SDK 35 / Gradle Builder (`swasthyasetu-android-builder`).

---

## Quick Start (Section 162)

### 1. Launch Services
```bash
docker compose up -d --build
```

### 2. Verify Service Health
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **API Health Check**: [http://localhost:4000/health](http://localhost:4000/health)
- **API Readiness Check**: [http://localhost:4000/ready](http://localhost:4000/ready)

### 3. Android Citizen Native APK
The verified native debug APK is built and ready in:
```text
artifacts/android/SwasthyaSetu-debug.apk
```
Package ID: `in.swasthyasetu.app` | Target SDK: 35 | Size: 5.8 MB

To re-build the APK locally (using containerized Android SDK):
```bash
cd frontend && NEXT_EXPORT=true npm run build && npx cap sync android && cd ..
docker run --rm -v $(pwd)/frontend:/app -w /app/android swasthyasetu-android-builder:latest ./gradlew --no-daemon assembleDebug
cp frontend/android/app/build/outputs/apk/debug/app-debug.apk artifacts/android/SwasthyaSetu-debug.apk
```

### Option B: Local Development Setup

```bash
# 1. Install dependencies
cd backend && npm install && cd ../frontend && npm install && cd ..

# 2. Start PostgreSQL with PostGIS & Redis
docker compose up -d postgres redis

# 3. Apply Prisma migrations & seed demo dataset
cd backend
npx prisma migrate deploy
npm run db:import-hfr
npm run db:generate-public-dataset
npm run db:generate-demo
cd ..

# 4. Start backend & frontend in parallel
# Terminal 1:
cd backend && npm run dev
# Terminal 2:
cd frontend && npm run dev
```

---

## Demo Personas & Fast Role Switcher

For jury evaluation and testing, you do not need active SMS credits.
- **Mock OTP for all logins**: `123456`
- **Instant Role Switcher**: Click the account badge in the top right navbar to switch between:
  1. **Citizen**: Smt. Sunita Patil (`9800000001`)
  2. **Frontline Worker (CHW/ASHA)**: Priya Shinde (`9800000002`)
  3. **Doctor / Medical Officer**: Dr. Rajesh Sharma (`9800000003`)
  4. **Facility Administrator**: Dhanukarwadi Admin (`9800000004`)
  5. **District Health Officer (DHO)**: Dr. Anand Mehta (`9800000005`)

To reset all data to a pristine demonstration state:
```bash
make demo-reset
# or POST http://localhost:4000/api/v1/demo/reset
```

---

## Makefile Command Reference

```bash
make help         # Show all available commands
make build        # Build all Docker containers
make up           # Launch stack in background
make down         # Stop and clean stack
make test         # Run backend automated test suites (Geo, Triage, Referral State Machine)
make demo-reset   # Cleanly reload HFR facilities and deterministic synthetic data
```

---

## Verification & Automated Test Suites

The codebase includes automated test suites covering core business logic:
```bash
cd backend && npm run test
```
- **Geo Spatial Suite**: PostGIS coordinate mapping, Haversine accuracy, distance sorting.
- **Triage Decision Support Suite**: SpO2 thresholds (<92% RED), vital sign scoring, syndromic red-flag rules.
- **Referral State Machine Suite**: Strict 8-step transition validation, illegal transition rejection (`COMPLETED` cannot move to `REQUESTED`).
- **Integration API Suite**: Healthcheck, facility catalogue, care router recommendations, queue token issuance.

---

## Documentation Links

- [System Architecture & Design Document](docs/architecture.md)
- [REST API Reference Manual](docs/api.md)
- [Turnkey Hackathon Jury Demo Script](docs/demo-script.md)
- [DPDP Act Compliance & Security Governance](docs/security.md)
- [Prisma Schema & PostGIS Data Model](docs/data-model.md)

---

## License

Developed for the Smart India Hackathon (SIH26133). Licensed under the MIT License.
