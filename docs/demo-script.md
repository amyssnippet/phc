# MahaSwasthya Grid — Hackathon Presentation & Jury Demo Script

This document provides a 5-minute turnkey presentation flow demonstrating the full end-to-end capabilities of MahaSwasthya Grid for the SIH Evaluation Committee.

---

## Pre-Demo Setup Checklist

1. **Verify Services**: Open `http://localhost:3000` (Frontend) and `http://localhost:4000/health` (Backend).
2. **Reset Demo State (Clean Slate)**:
   ```bash
   make demo-reset
   # or curl -X POST http://localhost:4000/api/v1/demo/reset
   ```
3. **Demo Credentials**:
   - **Mock OTP for all logins**: `123456`
   - **Role Switcher**: Click the top-right account dropdown to instantly switch roles without SMS verification.

---

## 5-Minute Evaluation Walkthrough

### Act 1: The Citizen Journey (Care Navigation & Queue Avoidance)
*Scenario: Smt. Sunita Patil, living in Kandivali West, feels acute chest tightness and needs appropriate care without waiting 3 hours at a crowded tertiary hospital.*

1. **Open Catalogue** (`http://localhost:3000`):
   - Show the 10 facilities in Mumbai Suburban imported directly from the State Health Facility Registry (HFR).
   - Point out the **Data Quality Score** badge on each facility card (showing 95% on Dhanukarwadi UPHC, and warning flags on facilities with data anomalies).
2. **Care Router** (`/find-care`):
   - Enter location: `400067` (Kandivali West).
   - Select symptoms: *Severe Chest Pain / Pressure*.
   - The engine automatically calculates the 100-point multi-criteria score (Distance: 35%, Live Queue Wait: 25%, Clinical Capability: 20%, Operating Hours: 10%, Data Quality: 10%).
   - Explainability: Show the **"Why This Facility?"** cards explaining the algorithmic recommendation.
3. **Book Consultation Token**:
   - Click "Join Live Queue" at Dhanukarwadi UPHC.
   - Observe live estimated wait time: `~12 mins`.

---

### Act 2: Frontline Worker Desk (Offline-First Point of Care)
*Scenario: An ASHA worker in an informal slum cluster conducts home screening where mobile 4G connectivity is degraded or offline.*

1. **Navigate to Frontline Portal** (`/frontline`):
   - Switch persona to **Frontline Worker (CHW)** in the navbar.
   - Note the **Clinical Decision Support (CDSS)** safety advisory banner ("Assistive Heuristic Only — Not a Diagnosis").
2. **Register Patient Offline** (`/frontline/patients/new`):
   - Enter: First Name: *Aarav*, Last Name: *Gaikwad*, Age: *42*, Pincode: *400067*.
   - Toggle browser network offline (or disconnect Wi-Fi): The form saves instantaneously to client **Dexie / IndexedDB** and generates a local draft reference.
3. **Syndromic Triage** (`/frontline/triage`):
   - Select the patient.
   - Record vitals:
     - Temp: `38.8` °C
     - SpO2: `91` % (< 92% critical threshold)
     - Heart Rate: `118` bpm
     - BP: `165/100` mmHg
   - Watch the **Live Urgency Calculator** dynamically illuminate **RED EMERGENCY** with exact trigger tags (`Severe Hypoxemia`, `Tachycardia`).
   - Click "Confirm & Save Triage".

---

### Act 3: Field Sync Center (Zero Data Loss)
*Scenario: The CHW walks back to the health post where Wi-Fi reconnects.*

1. **Navigate to Sync Center** (`/frontline/sync`):
   - Show the Staged Operations Queue listing the queued patient creation and triage mutations.
   - Click **"Sync Now"**.
   - Watch the operations push idempotently to `/api/v1/sync/push`. Statuses flip to green `SYNCED`.
   - The central PostgreSQL database now holds the verified record with complete audit lineage.

---

### Act 4: Doctor Station & Queue Console (OPD Management)
*Scenario: Medical Officer at Dhanukarwadi UPHC conducts OPD and coordinates specialist care.*

1. **Open OPD Queue Console** (`/facility/queue`):
   - Show the **Active in Doctor Chamber** card displaying the currently served patient.
   - Click **"Call Next Patient"**: The queue advances, electronic call chime sounds, and the next waiting token enters the chamber.
   - Click **"Complete Consultation"**.
2. **Referral Review Desk** (`/facility/referrals`):
   - Review incoming referrals from peripheries.
   - Click **"Accept"** on an urgent escalation.
   - Click **"Timeline"** (`/citizen/referrals/:id`): Walk the jury through the **8-step vertical audit timeline** (`REQUESTED` -> `ACCEPTED` -> `DISPATCHED` -> `ARRIVED` -> `IN_CONSULTATION` -> `COMPLETED`).
   - Emphasize: *No paper referral slip lost in transit.*

---

### Act 5: District Health Command Center (GIS & Data Quality)
*Scenario: District Health Officer (DHO) monitors suburban health capacity and audits government registry errors.*

1. **Command Dashboard** (`/command`):
   - **Referral Pipeline Funnel** (Recharts visualizer): Shows closed-loop referral completion rates across the district.
   - **Facility Data Quality Index**: Displays automated scoring across all 10 facilities.
2. **HFR Data Quality Exception Detector**:
   - Highlight the **Saturday 17:93 & 17:73 invalid closing hours** detected in the raw state dataset (`mumbai-suburban.json`).
   - Click **"Mark Corrected"** to demonstrate automated data hygiene workflows.
3. **Interactive GIS Health Map** (`/command/map`):
   - Leaflet / OpenStreetMap visualizer centered on Mumbai Suburban.
   - Click any health center pin to inspect coordinates, live queue status, and data certification badge.

---

## Instant Recovery Command

If needed during presentation, run:
```bash
make demo-reset
```
This reloads the database and repopulates all 21 demo users, 10 facilities, 50 encounters, and 50 referrals in under 2 seconds.
