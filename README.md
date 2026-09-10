# MahaSwasthya Grid (महास्वास्थ्य ग्रिड)

> **SIH26133 Prototype** — Offline-First Geospatial Health Navigation, Algorithmic Care Routing, and Closed-Loop Referral Management for Urban Maharashtra.

[![Docker Compose](https://img.shields.io/badge/Docker-Compose_v2-2496ED?logo=docker&logoColor=white)](#docker-compose-quickstart)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-PostGIS_3.5-336791?logo=postgresql&logoColor=white)](#geospatial-engine)
[![Next.js](https://img.shields.io/badge/Next.js_14-App_Router-000000?logo=next.js&logoColor=white)](#frontend-architecture)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](#technology-stack)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)

---

## Highlights & Key Innovations

1. **Deterministic 100-Point Algorithmic Care Router**:
   Distributes patient load away from crowded tertiary hospitals to equipped Urban Primary Health Centres (UPHCs) using multi-criteria weighted scoring:
   - **Distance**: 35% (PostGIS geodesic distance)
   - **OPD Queue Wait Time**: 25% (Live token load)
   - **Clinical Capability & Tier**: 20% (Emergency vs General OPD)
   - **Operating Hours**: 10% (Open now vs closing soon)
   - **Facility Data Quality**: 10% (Registry reliability)

2. **Offline-First Frontline Worker (CHW / ASHA) Desk**:
   - Built on **Dexie / IndexedDB** for 100% functionality without internet.
   - Point-of-care patient registration with local draft generation.
   - Syndromic triage with vital signs input and **Clinical Decision Support (CDSS)** safety rules.
   - Idempotent batch push to `/api/v1/sync/push` with conflict resolution.

3. **8-Step Closed-Loop Referral State Machine**:
   - Eliminates lost paper slips between primary health posts and secondary hospitals.
   - Deterministic lifecycle: `REQUESTED` &rarr; `ACCEPTED` &rarr; `DISPATCHED` &rarr; `ARRIVED` &rarr; `IN_CONSULTATION` &rarr; `COMPLETED`.
   - Complete vertical milestone timeline accessible by both citizen and clinician.

4. **Real HFR Source Ingestion & Data Quality Engine**:
   - Ingests real 10-facility dataset from Mumbai Suburban district (`mumbai-suburban.json`).
   - Automatically detects erroneous government records (specifically Saturday invalid close times `17:93` in DDU2 RCH UPHC and `17:73` in Dindoshi Vasahat UPHC).
   - Generates sanitized public registry (`mumbai-suburban.public.json`) stripping personal officer contacts to comply with DPDP Act 2023.

5. **Interactive GIS District Command Map**:
   - Client-rendered Leaflet OpenStreetMap visualizer centered on Mumbai Suburban.
   - PostGIS GiST spatial indexing for millisecond radius queries.

---

## Technology Stack

- **Frontend**: Next.js 14 (App Router, Standalone build), React 18, Tailwind CSS, Lucide Icons, Recharts, Leaflet, Dexie.js (IndexedDB).
- **Backend**: Node.js 20, Express 5, TypeScript, Prisma ORM, BullMQ, Redis 7, Winston logger.
- **Database & Spatial**: PostgreSQL 17 with PostGIS 3.5 extension (`postgis/postgis:17-3.5`).
- **DevOps**: Multi-stage Dockerfiles, Docker Compose, Healthchecks, Makefile.

---

## Quickstart

### Prerequisites
- Docker & Docker Compose (v2.20+)
- Node.js 20+ & npm (if running locally without Docker)

### Option A: 1-Command Startup with Docker Compose (Recommended)

```bash
# Clone and enter directory
cd /home/amolycd/Dev/phc

# Start all 5 services (PostgreSQL, Redis, Backend API, Worker, Frontend)
make up
# Or: docker compose up -d --build
```

Access the applications:
- **Web Application (Citizen & Portals)**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Health**: [http://localhost:4000/health](http://localhost:4000/health)
- **API Documentation & Diagnostics**: [http://localhost:4000/ready](http://localhost:4000/ready)

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
