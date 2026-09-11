# SwasthyaSetu — Phase 3 Reproducible Build & Deployment Guide

## 1. Prerequisites

- **Docker & Docker Compose** (v24+)
- **Node.js** (v20+ or v24+)
- **Git**
- **Android Build Requirements:**
  - Option A: Pre-configured Docker Builder (`swasthyasetu-android-builder:latest`) — *Recommended (no local Android SDK required)*
  - Option B: Host Android SDK with Commandline Tools, Build-Tools 35.0.0, Platform 35, and JDK 21.

---

## 2. Docker Stack Startup (Backend, Worker, Postgres, Redis, Frontend)

Run the full production stack:

```bash
docker compose up -d --build
```

Verify service health:

```bash
docker compose ps

# Check backend health & readiness
curl http://localhost:4000/health
curl http://localhost:4000/ready

# Check frontend web access
curl -I http://localhost:3000
```

---

## 3. Building the Next.js Frontend Bundle

### Standard SSR / Standalone Production:
```bash
cd frontend
npm install
npm run build
```

### Static Export Bundle (for Capacitor Android Shell):
```bash
cd frontend
NEXT_EXPORT=true npm run build
```
This generates the client static distribution into `frontend/out` with 78 static routes.

---

## 4. Building the Citizen Android Native APK

### Step A: Sync web bundle to Capacitor Android
```bash
cd frontend
npx cap sync android
```

### Step B: Build Debug APK via Containerized Android Builder
```bash
# Build the APK without requiring local Android Studio/SDK on host:
docker run --rm \
  -v $(pwd)/frontend:/app \
  -w /app/android \
  swasthyasetu-android-builder:latest \
  ./gradlew --no-daemon assembleDebug
```

### Step C: Verified Artifact Location
The verified APK is located at:
```text
artifacts/android/SwasthyaSetu-debug.apk
```
Original Gradle build artifact:
```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Headless APK Verification (No Emulator Needed)

Run verification tools inside the Android builder container:

```bash
# 1. Verify Package & Badging:
docker run --rm -v $(pwd):/workspace swasthyasetu-android-builder:latest \
  /opt/android-sdk/build-tools/35.0.0/aapt dump badging /workspace/artifacts/android/SwasthyaSetu-debug.apk

# 2. Verify Cryptographic Signature & Integrity:
docker run --rm -v $(pwd):/workspace swasthyasetu-android-builder:latest \
  /opt/android-sdk/build-tools/35.0.0/apksigner verify --verbose /workspace/artifacts/android/SwasthyaSetu-debug.apk

# 3. Verify Zip Alignment:
docker run --rm -v $(pwd):/workspace swasthyasetu-android-builder:latest \
  /opt/android-sdk/build-tools/35.0.0/zipalign -c 4 /workspace/artifacts/android/SwasthyaSetu-debug.apk
```

---

## 6. Android Emulator & Physical Device API Configuration

The Capacitor configuration in `frontend/capacitor.config.ts` and `AndroidManifest.xml` supports cleartext HTTP for local testing:

- **Browser:** `http://localhost:4000/api/v1`
- **Android Emulator:** Map host localhost to `http://10.0.2.2:4000/api/v1`
- **Physical Device:** Connect to machine Wi-Fi/LAN IP (e.g., `http://192.168.1.X:4000/api/v1`) or production HTTPS backend.

---

## 7. Demo Accounts & Role Scopes

Switch personas in the header demo dropdown or test via API:

| Role | Demo User Name | Demo Phone | Default Access Scope |
|---|---|---|---|
| **Citizen** | Sunita Patil | `9800000001` | Own appointments, own OPD tokens, own referrals, own timeline, public facility catalogue. |
| **Frontline Worker (CHW)** | ASHA Shobha Tai | `9800000002` | Patient registration, vitals, triage, primary referrals, offline sync queue. |
| **Doctor** | Dr. Rajesh Kulkarni | `9800000003` | Assigned facility chamber (Dhanukarwadi UPHC), live queue, call next, consultation complete, specialist referral. |
| **Facility Admin** | Suresh Patil | `9800000004` | Dhanukarwadi UPHC queue manager, inbound referrals desk, operational status. |
| **District Officer** | Dr. Vinay Joshi (DHO) | `9800000005` | Mumbai Suburban GIS health map (50 facilities), district KPI funnel, data quality & CDSS engine. |

---

## 8. Offline Operation Verification

1. **Facility Directory:**
   The APK bundles `frontend/lib/data/mumbai-suburban.public.json` with 50 sanitized facilities.
   When offline, `citizen-repositories.ts` automatically serves cached/bundled facilities and calculates Haversine distance.
2. **Offline Triage & Drafts:**
   Frontline workers can create patient drafts and record triage while disconnected; mutations are persisted in Dexie (`db.syncQueue`) and synced once network returns.
