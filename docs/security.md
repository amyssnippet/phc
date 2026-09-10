# MahaSwasthya Grid — Security, Privacy & Clinical Governance

## 1. Compliance with Digital Personal Data Protection (DPDP) Act 2023

MahaSwasthya Grid implements strict digital privacy safeguards designed for India's healthcare data ecosystem:

### 1.1 Synthetic Data Safeguard
- **Zero Real Patient Data**: All patient demographic records, vital readings, prescription histories, and referral logs in this prototype are deterministically generated synthetic entities.
- **Lineage Tags**: Every generated demo record is marked with an immutable database attribute `demoData: true` and displayed with prominent `[DEMO DATA]` badges in the UI.

### 1.2 HFR Source Contact Sanitization
- The raw National Health Facility Registry source file (`mumbai-suburban.json`) contains private mobile numbers and personal email addresses of public medical officers and clerks.
- The pipeline script `backend/scripts/create-public-facility-dataset.ts` automatically redacts and sanitizes these private contact details before bundling into `frontend/lib/data/mumbai-suburban.public.json`.
- Public citizen views only expose verified official landlines, emergency desk numbers, and sanitized public facility contacts.

---

## 2. Clinical Decision Support (CDSS) Governance

### 2.1 Non-Diagnostic Boundary
- Algorithmic triage scoring (RED / YELLOW / GREEN) is strictly classified as **Clinical Decision Support (CDSS)** under Medical Device Rules.
- It does **not** make diagnostic claims or prescribe medications.
- A prominent disclaimer is enforced across all triage and care-routing views:
  > *"ASSISTIVE DECISION SUPPORT ONLY — NOT A CLINICAL DIAGNOSIS. All triage scores and routing suggestions must be evaluated and confirmed by an authorized Medical Officer."*

### 2.2 Explainable Routing Heuristics
- The 100-point care router uses a deterministic, audit-compliant scoring algorithm:
  - **Distance**: 35%
  - **OPD Queue Wait Time**: 25%
  - **Specialty & Facility Tier Match**: 20%
  - **Operating Hours & Schedule**: 10%
  - **Facility Data Quality Score**: 10%
- "Why This Facility?" explainability strings are calculated on every request and saved alongside referrals for medico-legal clarity.

---

## 3. Role-Based Access Control (RBAC)

The system enforces 5 distinct role tiers across both JWT middleware and UI route guards:

| Role | Scope & Permissions |
| :--- | :--- |
| **CITIZEN** | Browse facilities, view personal appointments, track personal referrals and care timeline. Cannot view other citizens' medical records. |
| **CHW (ASHA / ANM)** | Register community patients, record vital signs, run syndromic triage, initiate primary referrals, queue offline operations. |
| **DOCTOR** | Call and consult queue tokens, issue prescriptions, initiate secondary/tertiary referrals, view clinical patient history. |
| **FACILITY_ADMIN** | Manage facility queues, configure doctor rosters, accept/reject inbound inter-facility referrals. |
| **DISTRICT_OFFICER** | District-wide macro analytics, inspect data quality anomalies, resolve HFR registry errors, view GIS operational heatmaps. |

---

## 4. Tamper-Resistant Audit Logging

- Every critical state transition is permanently recorded in the relational `AuditLog` table:
  - Actor ID, User Role, and Authenticated Session
  - Source IP and User-Agent
  - Entity Type (e.g. `REFERRAL`, `QUEUE_TOKEN`, `PATIENT`)
  - Action (e.g. `CREATE`, `ACCEPT`, `REJECT`, `SYNC_PUSH`)
  - State Diff Payload (`previousStatus`, `newStatus`, `reason`)
  - ISO 8601 Timestamp
