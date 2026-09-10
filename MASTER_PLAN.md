# SIH26133 — MahaSwasthya Grid
## Autonomous Build Master Plan

> **Purpose:** This document is the single source of truth for an autonomous coding agent. The agent must be able to create, implement, run, test, repair, seed, containerize, and verify the complete prototype without asking the user for clarification.
>
> **Problem Statement:** SIH26133 — Accessibility and quality of public healthcare services, particularly in rural and underserved areas.
>
> **Organization:** Government of Maharashtra  
> **Category:** Software  
> **Theme:** MedTech / BioTech / HealthTech  
> **Target:** SIH 2026 working prototype  
>
> **Primary implementation priority:** working end-to-end prototype > completeness > visual polish.

---

# 0. EXECUTION CONTRACT FOR THE AGENT

The agent executing this document is expected to operate autonomously.

## 0.1 Non-negotiable behavior

1. Do not ask the user questions about architecture, framework choice, folder names, schema, API shape, Docker layout, seed data, UI behavior, or feature priority.
2. Use the decisions in this document as the default authority.
3. When an implementation detail is unspecified, choose the smallest production-sensible implementation consistent with this document.
4. Do not replace the selected stack with another stack unless a selected technology is demonstrably incompatible with another selected requirement.
5. Implement features as working code, not placeholder screens.
6. Every API endpoint required by the frontend must be implemented and tested.
7. Every database table required by a workflow must exist and have migrations.
8. Every important workflow must have deterministic seed data and an automated test.
9. Run the application locally through Docker Compose before declaring the build complete.
10. Fix errors encountered during build, runtime, browser tests, migrations, linting, type checking, and integration tests.
11. Never use real patient records for demo data.
12. Never expose facility-source contact person's phone numbers, email addresses, or personal names in public APIs.
13. Never invent government statistics. Synthetic operational statistics must be marked as `DEMO DATA`.
14. Clinical logic is decision support only. The system must not claim to diagnose a patient.
15. Keep the public facility catalogue available offline, but never treat the bundled catalogue as a source of mutable operational truth.
16. The backend is authoritative for mutable server-side state when online.
17. Offline writes must be idempotent and synchronized safely when connectivity returns.
18. Never commit secrets into source control.
19. Do not use `latest` Docker tags for production-facing images.
20. Do not stop at scaffolding. A judge must be able to run the stack and complete the demo journey.

## 0.2 Definition of done

The project is complete only when all of the following are true:

- `docker compose up --build` starts the stack successfully.
- PostgreSQL with PostGIS starts with persistent volume storage.
- Redis starts successfully.
- Backend starts successfully and can connect to PostgreSQL and Redis.
- Database migrations execute successfully.
- Source JSON imports successfully.
- Database contains the real facility records from `mumbai-suburban.json` plus clearly marked synthetic demo data.
- Backend health checks return healthy.
- Frontend can authenticate using demo/mock OTP mode.
- Facility search works.
- Geospatial nearby search works.
- Care routing works.
- Appointment/token workflow works.
- Queue workflow works.
- Triage workflow works.
- Referral workflow works end to end.
- Follow-up workflow works.
- District dashboard updates from seeded operational data.
- Data-quality issues from the source dataset are detected.
- Offline mode works for designated read and write flows.
- Synchronization works after reconnect.
- Duplicate offline operations do not create duplicate server records.
- Playwright or equivalent end-to-end tests pass.
- Backend integration tests pass.
- Type checking passes.
- Linting passes.
- Production Docker build succeeds.
- README documents exact startup commands.
- A deterministic demo reset command is available.

---

# 1. PRODUCT DEFINITION

## 1.1 Product name

**MahaSwasthya Grid**

Tagline:

> **Public Healthcare Access & Continuity Network**

Secondary positioning:

> **Helping people reach the right public health service, and helping the health system keep the care journey connected.**

## 1.2 Product thesis

The prototype must behave like a public-health coordination layer rather than a generic hospital booking application.

The core chain is:

```text
Citizen
  ↓
Care Navigation
  ↓
Primary Facility
  ↓
Assessment
  ↓
Referral when necessary
  ↓
Receiving Facility
  ↓
Consultation
  ↓
Follow-up
  ↓
Continuity of Care
  ↓
District Operations / Quality Monitoring
```

## 1.3 Primary personas

### Citizen
Needs to find appropriate public care, get a token/appointment, track a referral, see follow-ups, and continue the care journey with minimal friction.

### Frontline Worker
Needs fast patient registration, triage capture, care navigation, referrals, and offline operation.

### Doctor / Facility Clinician
Needs patient encounter context, referrals, appointment queue, and follow-up creation.

### Facility Administrator
Needs queue operations, appointments, referral acceptance, facility-level operational visibility, and basic inventory/diagnostic demonstration.

### District Administrator
Needs a command center showing access, referrals, follow-up, facilities, and data quality.

---

# 2. SOURCE DATA CONTRACT

The project includes an uploaded file named:

```text
mumbai-suburban.json
```

It is a JSON response object containing a `content` array and pagination metadata.

The inspected dataset contains:

- 10 facility records.
- All 10 records have district `Mumbai Suburban`.
- All 10 records have geolocation values.
- All 10 records are `Primary Health Centre` in the inspected source.
- All 10 records are marked `Approved`.
- 8 records report `OPD` service type.
- 1 record reports `OPD,IPD`.
- 1 record reports `IPD`.
- 1 record has `emrSystem = Y`.
- 9 records have `emrSystem = N`.
- 7 records have `abdmSoftware = 1` and 3 have no value.
- Observed specialties include General Medicine, Obstetrics & Gynaecology, Paediatrics, Primary Care, Anaesthesia, Neonatology, and Gastroenterology.
- The source contains many null/unknown infrastructure fields.
- The source includes at least two invalid Saturday close-time values, including `Invalid time format - 17:93` and `Invalid time format - 17:73`.

These values are source observations only. They must not be presented as current district statistics.

## 2.1 Source fields to preserve

At minimum, preserve these source concepts:

```text
facUniqueId
facName
facOwnership
facOwnerGovt
facOwnerPrivate
ownerSubType
state
 district
pincode
geolocation
subDistrict
address1
address2
mobileNo
facEmail
facOperStatus
typeOfService
typeOfServiceOth
systemOfMedicine
facilityType
facilityTypeOth
emrSystem
emrSoftware
abdmSoftware
alternateId
source
status
activeYn
specialityDtls
operationRequestDTO
medicalInfraRequestDTO
lstUpdDt
```

Source fields that contain personal contact names, personal phone numbers, or personal email addresses must be stored only in a restricted import/audit representation if needed; do not copy them into public facility-facing APIs.

## 2.2 Source-versus-normalized rules

### `null` does not mean zero

For infrastructure fields:

```text
null → UNKNOWN
0    → 0
```

### Invalid source values are not silently repaired

Example:

```text
source closeTime = "Invalid time format - 17:93"
```

Normalized value:

```text
closeTime = null
```

and create:

```text
DataQualityIssue
issueType = INVALID_TIME
sourceValue = "Invalid time format - 17:93"
```

The original source value must remain recoverable in the import snapshot/audit record.

### Source ownership and source system

Store:

```text
source = HFR
```

and record the source update timestamp.

---

# 3. SYSTEM ARCHITECTURE

## 3.1 Overall topology

```text
                           INTERNET / LAN
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │      Next.js Frontend    │
                    │      PWA / Capacitor     │
                    └────────────┬─────────────┘
                                 │
                            HTTPS / REST
                                 │
                       ┌─────────▼──────────┐
                       │   Express API      │
                       │   TypeScript       │
                       └───────┬──────┬─────┘
                               │      │
                    ┌──────────▼─┐  ┌─▼──────────┐
                    │ PostgreSQL  │  │   Redis    │
                    │ + PostGIS   │  │            │
                    └──────┬──────┘  └─────┬──────┘
                           │                │
                       persistent       queue/cache
                        database
```

## 3.2 Dockerized services

Required services:

```text
postgres
redis
backend
frontend
worker
```

Optional only if actually useful:

```text
nginx / reverse-proxy
```

Do not add unnecessary infrastructure such as Kafka, Elasticsearch, Kubernetes, or separate microservices.

## 3.3 Modular monolith decision

Backend must be a modular monolith.

All domains live inside one Express process but have strict module boundaries.

This is preferred for a hackathon prototype because:

- simpler local execution;
- simpler Docker deployment;
- simpler debugging;
- simpler transactions;
- no network hops between tightly coupled domain modules;
- easier demo reliability.

---

# 4. REPOSITORY STRUCTURE

Recommended monorepo:

```text
mahaswasthya-grid/
│
├── MASTER_PLAN.md
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── Makefile
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── data/
│   │   ├── source/
│   │   │   └── mumbai-suburban.json
│   │   └── demo/
│   ├── scripts/
│   │   ├── import-hfr-json.ts
│   │   ├── reset-demo.ts
│   │   └── generate-demo-data.ts
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── modules/
│   │   ├── services/
│   │   ├── jobs/
│   │   ├── db/
│   │   ├── utils/
│   │   └── types/
│   └── tests/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── capacitor.config.ts
│   ├── public/
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── offline/
│   │   ├── validators/
│   │   ├── maps/
│   │   └── data/
│   │       └── mumbai-suburban.public.json
│   ├── hooks/
│   ├── stores/
│   └── tests/
│
└── docs/
    ├── architecture.md
    ├── api.md
    ├── demo-script.md
    └── security.md
```

---

# 5. BACKEND MODULES

Each module should contain:

```text
<module>.routes.ts
<module>.controller.ts
<module>.service.ts
<module>.schema.ts
<module>.types.ts
```

Optional repository file:

```text
<module>.repository.ts
```

Use a repository only when queries are complex enough to justify separation.

Required modules:

```text
ات
```

The actual names are:

```text
auth
users
patients
facilities
practitioners
care-routing
triage
encounters
appointments
queues
referrals
followups
diagnostics
medicines
notifications
consent
analytics
data-quality
sync
demo
```

---

# 6. DATABASE TECHNOLOGY

Use:

```text
PostgreSQL
PostGIS
Prisma
```

The Docker image should be explicitly pinned to a compatible PostgreSQL/PostGIS release rather than `latest`.

Recommended baseline for this prototype:

```text
postgis/postgis:17-3.5
```

This tag is currently documented as a PostgreSQL 17 / PostGIS 3.5 image and uses the legacy PostgreSQL data directory path. citeturn643546search1turn643546search2

Do not change the image version casually because PostgreSQL 18 image volume paths differ from the 14–17 convention. citeturn643546search1

---

# 7. DATABASE ENUMS

Create these enums unless a strong implementation reason requires replacing one with a constrained string.

```text
UserRole
- CITIZEN
- FRONTLINE_WORKER
- DOCTOR
- FACILITY_ADMIN
- DISTRICT_ADMIN
- SUPER_ADMIN

Urgency
- LOW
- MEDIUM
- HIGH
- CRITICAL

AppointmentStatus
- BOOKED
- CHECKED_IN
- CALLED
- COMPLETED
- CANCELLED
- NO_SHOW

QueueStatus
- WAITING
- CALLED
- IN_CONSULTATION
- COMPLETED
- CANCELLED

ReferralStatus
- CREATED
- SENT
- ACCEPTED
- REJECTED
- APPOINTMENT_BOOKED
- PATIENT_ARRIVED
- CONSULTED
- FOLLOWUP_CREATED
- COMPLETED
- CANCELLED

ReferralEventType
- CREATED
- SENT
- VIEWED
- ACCEPTED
- REJECTED
- APPOINTMENT_BOOKED
- PATIENT_ARRIVED
- CONSULTED
- FOLLOWUP_CREATED
- COMPLETED
- CANCELLED

FollowUpStatus
- PENDING
- DUE
- COMPLETED
- MISSED
- CANCELLED

ResourceStatus
- AVAILABLE
- UNAVAILABLE
- UNKNOWN

ConsentStatus
- REQUESTED
- GRANTED
- REVOKED
- EXPIRED

DataQualityIssueType
- INVALID_TIME
- MISSING_HOURS
- MISSING_GEOLOCATION
- UNKNOWN_RESOURCE
- STALE_DATA
- MISSING_SPECIALTY
- INCONSISTENT_VALUE

IssueSeverity
- LOW
- MEDIUM
- HIGH
- CRITICAL

DataQualityStatus
- OPEN
- RESOLVED
- IGNORED

SyncOperation
- CREATE
- UPDATE
- DELETE

SyncStatus
- PENDING
- SYNCED
- CONFLICT
- FAILED
```

---

# 8. DATABASE MODEL

Implement the following model set.

## 8.1 User

```text
id UUID PK
name
phone UNIQUE
email nullable
role
preferredLanguage
demoUser boolean
createdAt
updatedAt
```

## 8.2 Patient

```text
id UUID PK
userId nullable UNIQUE
patientCode UNIQUE
firstName
lastName nullable
dateOfBirth nullable
sex nullable
phone nullable
address nullable
pincode nullable
latitude nullable
longitude nullable
location geography(Point,4326) nullable
abhaReference nullable
emergencyName nullable
emergencyPhone nullable
demoData boolean
createdAt
updatedAt
```

Do not store Aadhaar.

## 8.3 Facility

```text
id UUID PK
externalFacilityId UNIQUE
name
facilityType
ownership nullable
ownerSubType nullable
systemOfMedicine nullable
serviceType nullable
serviceTypeOther nullable
pincode nullable
address nullable
latitude nullable
longitude nullable
location geography(Point,4326)
operationalStatus nullable
sourceStatus nullable
emrEnabled nullable
emrSoftware nullable
abdmEnabled nullable
alternateId nullable
source
sourceLastUpdated nullable
dataQualityScore integer default 100
demoData boolean default false
createdAt
updatedAt
```

## 8.4 FacilityHour

```text
id UUID PK
facilityId FK
weekday 0-6
is24Hours
openTime nullable
closeTime nullable
active
sourceValue JSON nullable
```

Unique:

```text
facilityId + weekday
```

## 8.5 FacilitySpecialty

```text
id UUID PK
facilityId FK
externalSpecialtyId nullable
name
active
```

## 8.6 FacilityResource

```text
id UUID PK
facilityId UNIQUE FK
totalBeds nullable
ipdBeds nullable
icuBeds nullable
ventilators nullable
diagnosticsStatus
imagingStatus
pharmacyStatus
bloodStatus
dialysisStatus
lastUpdated nullable
```

## 8.7 Practitioner

```text
id UUID PK
userId UNIQUE FK
facilityId FK
designation nullable
specialty nullable
licenseNumber nullable
active
```

## 8.8 Encounter

```text
id UUID PK
patientId FK
facilityId FK
practitionerId nullable FK
type
chiefComplaint nullable
notes nullable
status
startedAt nullable
completedAt nullable
demoData
```

## 8.9 TriageSession

```text
id UUID PK
patientId FK
encounterId UNIQUE FK
symptoms JSON
vitals JSON
riskFlags JSON
urgency
recommendedAction nullable
engineVersion
createdAt
```

## 8.10 Appointment

```text
id UUID PK
patientId FK
facilityId FK
practitionerId nullable FK
appointmentDate
startTime
endTime
tokenNumber nullable
status
source
createdAt
updatedAt
demoData
```

## 8.11 QueueToken

```text
id UUID PK
facilityId FK
appointmentId UNIQUE FK
department
tokenNumber
priority
status
estimatedWaitMinutes nullable
createdAt
calledAt nullable
completedAt nullable
```

## 8.12 Referral

```text
id UUID PK
patientId FK
encounterId nullable FK
sourceFacilityId FK
destinationFacilityId FK
createdById FK
reason
urgency
status
appointmentId nullable
createdAt
acceptedAt nullable
completedAt nullable
demoData
```

## 8.13 ReferralEvent

```text
id UUID PK
referralId FK
eventType
performedBy nullable
metadata JSON nullable
createdAt
```

## 8.14 FollowUp

```text
id UUID PK
patientId FK
encounterId nullable FK
type
dueDate
status
assignedTo nullable
notes nullable
completedAt nullable
demoData
```

## 8.15 DiagnosticService

```text
id UUID PK
facilityId FK
name
category nullable
status
lastUpdated nullable
demoData
```

## 8.16 Medicine

```text
id UUID PK
genericName
brandName nullable
strength nullable
dosageForm nullable
```

## 8.17 FacilityMedicineStock

```text
id UUID PK
facilityId FK
medicineId FK
quantity nullable
status
lastUpdated
demoData
```

Unique:

```text
facilityId + medicineId
```

## 8.18 ConsentRecord

```text
id UUID PK
patientId FK
requestingUserId FK
purpose
scope JSON
status
grantedAt nullable
expiresAt nullable
revokedAt nullable
```

## 8.19 Notification

```text
id UUID PK
userId FK
title
body
type
data JSON nullable
readAt nullable
createdAt
```

## 8.20 DataQualityIssue

```text
id UUID PK
facilityId nullable FK
issueType
severity
fieldName nullable
sourceValue nullable
description
status
createdAt
resolvedAt nullable
```

## 8.21 FacilitySnapshot

```text
id UUID PK
facilityId FK
snapshot JSON
source
capturedAt
```

## 8.22 SyncEvent

```text
id UUID PK
clientId
operationId UNIQUE
entityType
entityId nullable
operation
payload JSON
status
clientCreatedAt
serverCreatedAt
errorMessage nullable
```

## 8.23 AuditLog

```text
id UUID PK
actorId nullable
action
entityType
entityId nullable
metadata JSON nullable
ipAddress nullable
userAgent nullable
createdAt
```

## 8.24 DemoScenario

Optional but recommended.

```text
id UUID PK
name
version
createdAt
```

---

# 9. DATABASE INDEXES

Create indexes for:

```text
Facility.externalFacilityId
Facility.pincode
Facility.facilityType
Facility.serviceType
Facility.operationalStatus
Facility.source
FacilitySpecialty.name
Patient.patientCode
Patient.pincode
Appointment.facilityId
Appointment.appointmentDate
Referral.patientId
Referral.sourceFacilityId
Referral.destinationFacilityId
Referral.status
ReferralEvent.referralId
FollowUp.patientId
FollowUp.dueDate
Notification.userId
DataQualityIssue.status
DataQualityIssue.issueType
SyncEvent.clientId
SyncEvent.status
```

Create a spatial GiST index on:

```text
Facility.location
Patient.location
```

---

# 10. IMPORT PIPELINE

## 10.1 Import command

Provide:

```bash
npm run data:import
```

or inside Docker:

```bash
docker compose run --rm backend npm run data:import
```

## 10.2 Import steps

```text
read file
  ↓
validate JSON shape
  ↓
iterate content[]
  ↓
normalize facility
  ↓
parse geolocation
  ↓
validate coordinates
  ↓
upsert facility
  ↓
create snapshot
  ↓
parse specialties
  ↓
parse hours
  ↓
parse resources
  ↓
run data-quality checks
  ↓
recalculate facility quality score
```

## 10.3 Import idempotency

Importing the JSON multiple times must not create duplicate facilities, specialties, hours, or resource rows.

Use the source facility ID as the external identity:

```text
facUniqueId → externalFacilityId
```

## 10.4 Public data projection

Create a backend serializer called:

```text
publicFacilitySerializer
```

It must exclude all personal contact information from the raw source.

Public response may include:

```text
id
name
facilityType
ownership
serviceType
pincode
address
latitude
longitude
operationalStatus
emrEnabled
abdmEnabled
specialties
hours
resource status
sourceLastUpdated
dataQualityScore
```

---

# 11. FACILITY SEARCH ARCHITECTURE

## 11.1 Search request

```http
GET /api/v1/facilities/nearby
```

Query parameters:

```text
lat
lng
radius
specialty
facilityType
serviceType
openNow
abdm
emr
```

Defaults:

```text
radius = 10 km
```

## 11.2 Query behavior

1. Validate latitude and longitude.
2. Validate radius.
3. Query PostGIS using `ST_DWithin` or equivalent.
4. Calculate distance using `ST_Distance`.
5. Apply filters.
6. Compute open-now state.
7. Return normalized facility cards.
8. Sort by distance unless an explicit sort is requested.

## 11.3 Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "...",
        "name": "Dhanukarwadi UPHC",
        "facilityType": "Primary Health Centre",
        "distanceKm": 2.31,
        "isOpenNow": true,
        "specialties": ["General Medicine"],
        "dataQualityScore": 92
      }
    ]
  },
  "meta": {
    "count": 1
  }
}
```

---

# 12. CARE ROUTING ENGINE

The Care Router is the central decision-support service.

## 12.1 Important constraint

Do not build a medical diagnostic model.

The router determines where care should be accessed based on structured needs.

It must not tell a patient that they have a specific disease.

## 12.2 Input

```json
{
  "patientId": "uuid",
  "symptoms": ["fever", "cough"],
  "urgency": "MEDIUM",
  "requiredSpecialty": null,
  "requiredService": "PRIMARY_ASSESSMENT",
  "location": {
    "latitude": 19.207,
    "longitude": 72.838
  }
}
```

## 12.3 Requirement inference

Use a deterministic rules table.

Example:

```text
PRIMARY_ASSESSMENT
→ General outpatient / primary care

PREGNANCY_FOLLOWUP
→ Obstetrics & Gynaecology or maternal service

CHILD_ASSESSMENT
→ Paediatrics or primary care

DIAGNOSTIC_TEST
→ facility diagnostic service

SPECIALIST_REVIEW
→ matching specialty
```

The system may generate a suggested service requirement from user intent, but it must always label the result as a navigation recommendation.

## 12.4 Scoring model

Start with:

```text
specialtyMatch       30 points
serviceMatch         20 points
operationalStatus    15 points
distance              15 points
queue                 10 points
resource suitability  10 points
-----------------------------
maximum              100 points
```

Use normalized sub-scores.

## 12.5 Distance score

Use a monotonic function.

Suggested interpretation:

```text
0–1 km    → 100
1–3 km    → 90
3–5 km    → 75
5–10 km   → 55
10+ km    → 30
```

This is a prototype scoring heuristic, not a government metric.

## 12.6 Explainability

Every recommendation must contain:

```text
score
matchedCriteria
penalties
reasons
```

Example:

```json
{
  "score": 92,
  "reasons": [
    "Required specialty is available",
    "Facility is operational",
    "Facility is within preferred travel distance"
  ],
  "matchedCriteria": [
    "SPECIALTY",
    "SERVICE",
    "DISTANCE",
    "OPERATIONAL"
  ]
}
```

---

# 13. TRIAGE ENGINE

The triage system is decision support only.

## 13.1 Input

```json
{
  "patientId": "uuid",
  "encounterId": "uuid",
  "symptoms": ["fever", "cough"],
  "vitals": {
    "temperatureC": 39.1,
    "heartRate": 112,
    "respiratoryRate": 22,
    "oxygenSaturation": 96
  }
}
```

## 13.2 Output

```json
{
  "urgency": "HIGH",
  "riskFlags": [
    "ELEVATED_TEMPERATURE",
    "TACHYCARDIA"
  ],
  "recommendedAction": "PRIORITY_CLINICAL_ASSESSMENT",
  "disclaimer": "Decision support only. Not a diagnosis."
}
```

## 13.3 Safety behavior

If critical vitals are entered, surface:

```text
Emergency escalation recommended.
Seek immediate clinical assessment.
```

Do not produce medication dosage recommendations.

---

# 14. REFERRAL ENGINE

## 14.1 State machine

Allowed path:

```text
CREATED
  ↓
SENT
  ↓
ACCEPTED
  ↓
APPOINTMENT_BOOKED
  ↓
PATIENT_ARRIVED
  ↓
CONSULTED
  ↓
FOLLOWUP_CREATED
  ↓
COMPLETED
```

Alternative terminal states:

```text
REJECTED
CANCELLED
```

## 14.2 State transition enforcement

The service layer must reject illegal transitions.

Example:

```text
COMPLETED → CREATED
```

must fail with:

```text
INVALID_REFERRAL_STATE_TRANSITION
```

## 14.3 Create referral transaction

Use one database transaction:

```text
BEGIN

create referral
create CREATED event
create SENT event
create destination notification
create source notification if necessary

COMMIT
```

If any required step fails, roll back.

---

# 15. APPOINTMENT ENGINE

## 15.1 Booking behavior

Validate:

```text
patient exists
facility exists
facility is operational
requested day is open
requested time is inside valid hours
slot does not exceed demo capacity
```

Do not allow bookings against invalid source hours.

If hours are `UNKNOWN`, do not fabricate exact availability.

## 15.2 Queue token behavior

On appointment booking:

```text
create appointment
  ↓
generate token
  ↓
create queue token
```

Token format example:

```text
GM-042
OBG-014
PED-006
```

---

# 16. QUEUE ENGINE

Required operations:

```text
join queue
get queue state
call next
complete current
```

## 16.1 Demo wait-time formula

Use a transparent prototype estimate:

```text
estimatedWait = numberOfWaitingPatients × configurableAverageConsultationMinutes
```

Default:

```text
averageConsultationMinutes = 8
```

Mark operational queue values as:

```text
DEMO DATA
```

## 16.2 Live updates

Use Server-Sent Events if practical:

```http
GET /api/v1/queues/:facilityId/stream
```

Fallback to polling if SSE causes unnecessary complexity.

---

# 17. FOLLOW-UP ENGINE

Follow-ups are created when a clinician completes an encounter or referral.

Example:

```text
Consultation completed
  ↓
Follow-up due in 7 days
  ↓
BullMQ delayed job
  ↓
notification
  ↓
patient completes follow-up
```

Required follow-up types:

```text
GENERAL_REVIEW
MATERNAL_FOLLOWUP
CHILD_FOLLOWUP
DIABETES_REVIEW
HYPERTENSION_REVIEW
POST_REFERRAL_REVIEW
```

These are workflow labels, not diagnoses.

---

# 18. DATA QUALITY ENGINE

## 18.1 Purpose

Turn source imperfections into a visible system-quality feature.

## 18.2 Checks

Implement:

```text
INVALID_TIME
MISSING_HOURS
MISSING_GEOLOCATION
UNKNOWN_RESOURCE
STALE_DATA
MISSING_SPECIALTY
INCONSISTENT_VALUE
```

## 18.3 Quality score

Prototype score:

```text
100
- 20 for CRITICAL issue
- 10 for HIGH issue
- 5 for MEDIUM issue
- 2 for LOW issue
```

Clamp between 0 and 100.

This is an internal prototype score, not an official government rating.

## 18.4 Example source findings

The imported file contains an invalid Saturday time string in one facility (`17:93`) and another (`17:73`). These must appear in Data Quality Center results.

## 18.5 Staleness

Treat a facility record as potentially stale when:

```text
sourceLastUpdated older than 180 days
```

This threshold is a prototype configuration and must be labeled accordingly.

---

# 19. ANALYTICS MODEL

The command center must calculate metrics from operational database records.

Required metrics:

```text
totalFacilities
operationalFacilities
appointmentsToday
patientsSeenToday
queueWaiting
referralsCreated
referralsAccepted
referralsCompleted
referralCompletionRate
followupsDue
followupsCompleted
highRiskFollowups
openDataQualityIssues
averageEstimatedWaitMinutes
```

## 19.1 Referral completion rate

```text
completed referrals / referrals created
```

Return null or `N/A` if there are no referrals rather than showing `0%` ambiguously.

## 19.2 Follow-up completion rate

```text
completed follow-ups / due or completed-window follow-ups
```

Use a documented denominator.

---

# 20. API CONTRACT

Base URL:

```text
/api/v1
```

All APIs return:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "FACILITY_NOT_FOUND",
    "message": "Facility not found",
    "details": null
  }
}
```

---

# 21. AUTH ROUTES

```http
POST   /auth/send-otp
POST   /auth/verify-otp
POST   /auth/logout
GET    /auth/me
```

Mock OTP mode:

```env
OTP_MODE=MOCK
MOCK_OTP=123456
```

Never send real SMS in prototype mode.

---

# 22. USER ROUTES

```http
GET    /users/me
PATCH  /users/me
GET    /users/:id
```

Role-based access controls must be applied server-side.

---

# 23. PATIENT ROUTES

```http
GET    /patients
POST   /patients
GET    /patients/:id
PATCH  /patients/:id
GET    /patients/:id/timeline
GET    /patients/:id/referrals
GET    /patients/:id/followups
GET    /patients/:id/appointments
```

Patient search must not expose sensitive records to unauthorized users.

---

# 24. FACILITY ROUTES

```http
GET    /facilities
GET    /facilities/:id
GET    /facilities/search
GET    /facilities/nearby
GET    /facilities/map
GET    /facilities/:id/hours
GET    /facilities/:id/specialties
GET    /facilities/:id/resources
GET    /facilities/:id/queue
GET    /facilities/:id/diagnostics
```

---

# 25. CARE ROUTING ROUTES

```http
POST   /care-routing/recommend
GET    /care-routing/:id
```

Request:

```json
{
  "patientId": "uuid",
  "symptoms": ["fever", "cough"],
  "requiredService": "PRIMARY_ASSESSMENT",
  "urgency": "MEDIUM",
  "location": {
    "latitude": 19.207,
    "longitude": 72.838
  }
}
```

---

# 26. TRIAGE ROUTES

```http
POST   /triage
GET    /triage/:id
POST   /triage/:id/complete
```

---

# 27. ENCOUNTER ROUTES

```http
POST   /encounters
GET    /encounters/:id
PATCH  /encounters/:id
POST   /encounters/:id/complete
```

---

# 28. APPOINTMENT ROUTES

```http
GET    /appointments
POST   /appointments
GET    /appointments/:id
PATCH  /appointments/:id
POST   /appointments/:id/cancel
POST   /appointments/:id/check-in
```

---

# 29. QUEUE ROUTES

```http
GET    /queues/:facilityId
POST   /queues/:facilityId/join
POST   /queues/:facilityId/call-next
POST   /queues/:facilityId/complete
GET    /queues/:facilityId/stream
```

---

# 30. REFERRAL ROUTES

```http
GET    /referrals
POST   /referrals
GET    /referrals/:id
GET    /referrals/:id/timeline
POST   /referrals/:id/accept
POST   /referrals/:id/reject
POST   /referrals/:id/appointment
POST   /referrals/:id/arrive
POST   /referrals/:id/consult
POST   /referrals/:id/complete
POST   /referrals/:id/cancel
```

---

# 31. FOLLOW-UP ROUTES

```http
GET    /followups
POST   /followups
GET    /followups/:id
POST   /followups/:id/complete
```

---

# 32. MEDICINE ROUTES

```http
GET    /medicines
GET    /facilities/:facilityId/medicines
GET    /facilities/:facilityId/medicines/:medicineId
```

Facility inventory values are demo operational data unless explicitly sourced from a real live integration.

---

# 33. DIAGNOSTIC ROUTES

```http
GET    /facilities/:facilityId/diagnostics
```

---

# 34. CONSENT ROUTES

```http
GET    /consents
POST   /consents
POST   /consents/:id/revoke
```

This is a prototype consent abstraction. Do not claim live ABDM connectivity.

---

# 35. NOTIFICATION ROUTES

```http
GET    /notifications
POST   /notifications/:id/read
POST   /notifications/read-all
```

---

# 36. ANALYTICS ROUTES

```http
GET    /analytics/overview
GET    /analytics/facilities
GET    /analytics/referrals
GET    /analytics/followups
GET    /analytics/access
GET    /analytics/data-quality
```

District-level endpoints require `DISTRICT_ADMIN` or `SUPER_ADMIN`.

---

# 37. DATA QUALITY ROUTES

```http
GET    /data-quality/summary
GET    /data-quality/issues
GET    /data-quality/facilities/:facilityId
POST   /data-quality/issues/:id/resolve
POST   /data-quality/issues/:id/ignore
```

---

# 38. SYNC ROUTES

```http
POST   /sync/push
POST   /sync/pull
GET    /sync/status
```

## 38.1 Push payload

```json
{
  "deviceId": "device_abc",
  "operations": [
    {
      "operationId": "op_001",
      "entityType": "REFERRAL",
      "entityId": null,
      "operation": "CREATE",
      "payload": {
        "patientId": "...",
        "destinationFacilityId": "...",
        "reason": "Specialist assessment"
      },
      "clientCreatedAt": "2026-09-10T17:00:00.000Z"
    }
  ]
}
```

## 38.2 Sync response

```json
{
  "success": true,
  "data": {
    "accepted": [
      {
        "operationId": "op_001",
        "entityId": "ref_001",
        "status": "SYNCED"
      }
    ],
    "conflicts": [],
    "failed": []
  }
}
```

## 38.3 Idempotency rule

`operationId` must be unique.

If the same operation is submitted twice, return the result of the original operation. Do not create a duplicate entity.

## 38.4 Conflict rule

For conflicting updates:

```text
server state remains authoritative
```

Return:

```text
SYNC_CONFLICT
```

with enough detail for the frontend to explain the conflict.

---

# 39. DEMO ROUTES

Create development/demo-only routes:

```http
POST   /demo/reset
POST   /demo/scenarios/full-care-journey
GET    /demo/status
```

Disable these routes in production mode or protect them with `DEMO_MODE=true`.

The full-care scenario must create and return:

```json
{
  "patientId": "...",
  "appointmentId": "...",
  "queueTokenId": "...",
  "encounterId": "...",
  "triageId": "...",
  "referralId": "...",
  "followupId": "..."
}
```

---

# 40. CONTROLLER RULES

Controllers are thin.

Correct:

```text
validate request
call service
format response
next(error)
```

Incorrect:

```text
controller → directly contains large SQL/Prisma business rules
```

## 40.1 Controller example pattern

```ts
export async function createReferral(req, res, next) {
  try {
    const input = createReferralSchema.parse(req.body);

    const result = await referralService.createReferral({
      ...input,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
```

---

# 41. SERVICE LAYER RULES

Business rules belong in services.

Required major services:

```text
facilitySearchService
careRoutingService
triageService
appointmentService
queueService
referralService
followupService
notificationService
syncService
dataQualityService
auditService
analyticsService
```

---

# 42. TRANSACTIONAL RULES

Database transactions are mandatory for:

```text
create referral + event
accept referral + event + notification
book appointment + queue token
complete consultation + follow-up creation
sync operation + entity mutation + sync record
```

Use Prisma transactions.

---

# 43. EVENT / JOB ARCHITECTURE

Use Redis + BullMQ.

Required queues:

```text
notifications
followups
analytics
sync
```

Jobs:

```text
sendNotification
markFollowupDue
refreshAnalytics
processSync
```

The app must still work if a background notification job fails; transactional health data must not be lost solely because notification delivery failed.

---

# 44. BACKEND SECURITY BASELINE

Implement:

```text
Helmet
CORS allowlist
JSON body size limit
request ID
rate limiting
Zod validation
RBAC middleware
error sanitization
audit logging
```

Do not return Prisma/database exception internals to clients.

Never log:

```text
OTP
passwords
access tokens
refresh tokens
full patient medical payloads
```

---

# 45. ENVIRONMENT CONTRACT

Create `.env.example`.

Expected values:

```env
NODE_ENV=development
PORT=4000

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mahaswasthya

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mahaswasthya?schema=public
REDIS_URL=redis://redis:6379

JWT_ACCESS_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me

CORS_ORIGIN=http://localhost:3000

OTP_MODE=MOCK
MOCK_OTP=123456

DEMO_MODE=true

LOG_LEVEL=info
```

The agent may create a local `.env` from `.env.example` for development if it does not exist. Never commit `.env`.

---

# 46. DOCKER COMPOSE CONTRACT

Create a root `docker-compose.yml` with services:

```text
postgres
redis
backend
worker
frontend
```

## 46.1 PostgreSQL

Use a pinned `postgis/postgis` image.

Environment:

```text
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
```

Healthcheck:

```text
pg_isready
```

Volume:

```text
postgres_data
```

## 46.2 Redis

Pinned Redis 7 image.

Healthcheck:

```text
redis-cli ping
```

## 46.3 Backend

Build from:

```text
backend/Dockerfile
```

Depends on healthy:

```text
postgres
redis
```

Startup sequence:

```text
wait for dependencies
run migrations
run import/seed if configured
start API
```

## 46.4 Worker

Same backend image if convenient, but separate service command:

```text
npm run worker
```

## 46.5 Frontend

Build from:

```text
frontend/Dockerfile
```

Set API base URL through an explicit environment/build configuration.

---

# 47. HEALTH CHECKS

Backend:

```http
GET /health
GET /ready
```

`/health` checks the process.

`/ready` checks:

```text
PostgreSQL
Redis
```

Return:

```json
{
  "success": true,
  "data": {
    "status": "ready",
    "database": "up",
    "redis": "up"
  }
}
```

---

# 48. DOCKER STARTUP COMMANDS

Root commands in README:

```bash
docker compose up --build
```

For background execution:

```bash
docker compose up -d --build
```

Logs:

```bash
docker compose logs -f backend
```

Reset everything:

```bash
docker compose down -v
```

Rebuild:

```bash
docker compose build --no-cache
```

---

# 49. DATABASE MIGRATION / SEED ORDER

Container initialization order:

```text
PostgreSQL ready
   ↓
Prisma migrate deploy
   ↓
Enable/verify PostGIS
   ↓
Import source facilities
   ↓
Run source data quality checks
   ↓
Seed synthetic demo data
   ↓
Create demo scenario records
   ↓
Backend ready
```

Do not import source data every application restart if it is already present unless the operation is idempotent and lightweight.

---

# 50. DEMO DATA VOLUME

Generate approximately:

```text
50 synthetic patients
20 synthetic users
20 practitioners
100 appointments
100 queue tokens
50 encounters
50 triage sessions
50 referrals
60 referral events or more
40 follow-ups
20 medicines
40 facility medicine stock rows
30 diagnostics
20 notifications
```

Use deterministic seed values so the same seed generates the same IDs and relationships where practical.

Every synthetic operational entity must have:

```text
demoData = true
```

---

# 51. SYNTHETIC DEMO PERSONAS

At minimum create:

```text
Citizen:
Rajesh Patil
Pincode: 400067

Citizen:
Meena Sharma
Pincode: 400070

Citizen:
Abdul Khan
Pincode: 400043

Frontline worker:
Demo ASHA Worker

Doctor:
Demo General Medicine Doctor

Doctor:
Demo Obstetrics Doctor

Facility admin:
Demo Facility Admin

District admin:
Demo District Admin
```

These identities are synthetic and must be labeled internally as demo data.

---

# 52. AUTHORIZATION MATRIX

## Citizen

May:

```text
find facilities
view public facilities
manage own profile
create own appointment
view own referrals
view own timeline
view own followups
complete own followups where allowed
manage own consent
```

## Frontline Worker

May:

```text
register patient
view assigned patients
create encounter
create triage
create referral
view referral status
create follow-up
```

## Doctor

May:

```text
view assigned patients
manage encounter
view triage
create referral
accept/complete appropriate clinical workflow
create follow-up
```

## Facility Admin

May:

```text
manage queue
manage appointments
accept referrals
view facility operational data
manage demo inventory/diagnostics
```

## District Admin

May:

```text
view command center
view district analytics
view data quality
resolve/ignore data-quality issues
```

## Super Admin

All prototype functions.

---

# 53. FRONTEND ARCHITECTURE

The frontend uses:

```text
Next.js App Router
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
React Hook Form
Zod
next-intl or equivalent i18n
Recharts
MapLibre/Leaflet
Dexie/IndexedDB
Capacitor
```

Capacitor is a native runtime for web apps and can be added to an existing modern JavaScript project; the mobile architecture should therefore keep browser-compatible web behavior while adding native capabilities only where necessary. citeturn643546search0turn643546search3

---

# 54. FRONTEND ROUTES

## Public

```text
/
/find-care
/facilities
/facilities/[id]
/accessibility
/login
```

## Citizen

```text
/citizen
/citizen/care
/citizen/appointments
/citizen/referrals
/citizen/referrals/[id]
/citizen/records
/citizen/followups
/citizen/profile
```

## Frontline

```text
/frontline
/frontline/patients
/frontline/patients/new
/frontline/patients/[id]
/frontline/triage
/frontline/referrals
/frontline/sync
```

## Facility

```text
/facility
/facility/queue
/facility/appointments
/facility/referrals
/facility/patients
/facility/inventory
/facility/diagnostics
```

## Command center

```text
/command
/command/map
/command/facilities
/command/referrals
/command/access
/command/analytics
/command/quality
```

## Admin

```text
/admin
/admin/users
/admin/facilities
/admin/audit
```

---

# 55. OFFLINE ARCHITECTURE

## 55.1 Principle

The app must be useful without network access, but offline must not mean that every feature pretends to have current server state.

## 55.2 Offline data hierarchy

```text
1. Fresh backend API
2. IndexedDB cache
3. Bundled public facility catalogue
```

## 55.3 Bundled JSON

The frontend should contain a sanitized public JSON dataset:

```text
frontend/lib/data/mumbai-suburban.public.json
```

It must contain only public facility information.

Do not bundle raw source contact-person phone numbers or emails.

## 55.4 IndexedDB

Use Dexie or another typed IndexedDB wrapper.

Suggested stores:

```text
facilities
patients
patientDrafts
appointments
referrals
followups
notifications
triageDrafts
syncQueue
metadata
```

---

# 56. OFFLINE READ BEHAVIOR

When online:

```text
GET API
  ↓
render
  ↓
cache in IndexedDB
```

When offline:

```text
IndexedDB
  ↓ unavailable
bundled public facility JSON
```

The UI must display:

```text
Offline mode
Last synchronized: <timestamp>
```

If a record may be stale, say so.

---

# 57. OFFLINE WRITE BEHAVIOR

Allowed offline writes for prototype:

```text
patient draft
triage draft
referral draft
follow-up completion action
appointment request draft
```

Operationally dangerous real-time actions should not pretend they succeeded on the server when offline.

For example:

```text
Book appointment offline
```

should display:

```text
Appointment request saved locally.
It will be submitted when connectivity returns.
```

Do not display “confirmed” until server acknowledgment is received.

---

# 58. SYNC MANAGER

Create:

```text
frontend/lib/offline/sync-manager.ts
```

Responsibilities:

```text
monitor connection
read pending operations
send batches
retry transient errors
mark synced
surface conflicts
prevent duplicate submissions
```

Trigger sync on:

```text
app startup
network regain
manual "Sync Now"
foreground resume
```

---

# 59. OFFLINE UI

Global indicator:

```text
● Online

or

○ Offline
3 changes pending
```

Dedicated sync page:

```text
SYNC CENTER

Pending: 3
Synced today: 18
Conflicts: 0
Last sync: 10:42 PM

[ Sync now ]
```

---

# 60. CAPACITOR RULES

Keep the Next.js app responsive and browser-compatible first.

Then add Capacitor.

Recommended native capabilities:

```text
geolocation
network status
camera/QR scanning if implemented
push notifications if implemented
share
haptics only if useful
```

Do not introduce native plugins unless a browser implementation cannot do the job reliably.

For the hackathon, mobile web + Capacitor packaging is the target; iOS-specific work is optional if the team is only demonstrating Android.

---

# 61. NEXT.JS STATIC / MOBILE CONSTRAINTS

When packaging with Capacitor, keep the application architecture compatible with a client-hosted web bundle.

Do not depend on Next.js server-only APIs from inside the packaged mobile app.

The backend remains remote and is accessed through HTTPS.

The bundled mobile application contains:

```text
UI
static public facility catalogue
offline database
sync client
```

The bundled mobile application does not contain:

```text
PostgreSQL credentials
Redis credentials
JWT signing secrets
backend business secrets
```

---

# 62. UI DESIGN SYSTEM

Use shadcn/ui.

Required primitives:

```text
Button
Card
Badge
Alert
Dialog
Sheet
Drawer
Tabs
Table
Command
Combobox
Input
Textarea
Form
Calendar
Popover
Progress
Tooltip
Skeleton
Separator
Avatar
Breadcrumb
Sidebar
DropdownMenu
Select
ScrollArea
```

## 62.1 Visual language

```text
clean
trustworthy
healthcare/public-service
high legibility
moderate density
responsive
accessible
minimal decorative effects
```

Do not use excessive glassmorphism, huge gradients, or startup-style neon aesthetics.

---

# 63. ACCESSIBILITY REQUIREMENTS

Implement:

```text
keyboard navigation
visible focus states
semantic HTML
ARIA labels where required
minimum readable contrast
large touch targets
reduced motion support
screen-reader friendly buttons
icon + text, not icon alone
font-size controls
high-contrast mode
language switcher
```

Language target:

```text
English
Hindi
Marathi
```

All core labels must have translations.

Do not rely on machine translation during the demo if a manual translation table is simple enough.

---

# 64. CITIZEN HOME SCREEN

Primary action hierarchy:

```text
How can we help?

[ Find care near me ]

[ Book a token ] [ My referral ]

Next care action

Upcoming follow-up
```

Avoid exposing the entire feature set at once.

---

# 65. FIND CARE SCREEN

Required interactions:

```text
location
need/service selector
urgency selector
specialty selector optional
search button
```

Result card:

```text
facility name
facility type
distance
open/unknown/closed state
specialties
service type
data quality indicator
why recommended
```

---

# 66. CARE ROUTER SCREEN

Show:

```text
Recommended for you

1. Facility A
92 match
2.8 km

Why:
✓ Required service
✓ Operational
✓ Within preferred distance
```

Never say:

```text
AI says you have...
```

Never present a medical diagnosis.

---

# 67. REFERRAL TIMELINE SCREEN

Use a vertical timeline:

```text
Referral created
      │
      ▼
Sent
      │
      ▼
Accepted
      │
      ▼
Appointment booked
      │
      ▼
Patient arrived
      │
      ▼
Consulted
      │
      ▼
Follow-up
      │
      ▼
Completed
```

This is a flagship UI surface.

---

# 68. FRONTLINE HOME

Show:

```text
Today

Patients
Screened
Referrals
Follow-ups

[ + New Patient ]
[ Start Triage ]

Offline / sync status
```

The first actions must be reachable with minimal taps.

---

# 69. FACILITY DASHBOARD

Show:

```text
Current queue
Estimated wait
Priority patients
Appointments today
Pending referrals
```

Use simulated values with:

```text
DEMO DATA
```

---

# 70. COMMAND CENTER

This is the strongest desktop experience.

Top KPI row:

```text
Facilities
Operational now
Appointments today
Referral completion
Pending follow-ups
Data quality alerts
```

Main sections:

```text
Map
Referral funnel
Facility performance
Access indicators
Follow-up monitoring
Data quality
```

---

# 71. MAP

Use a web map library compatible with Next.js client rendering.

Map markers:

```text
facility type
operational status
specialty
```

Filters:

```text
facility type
specialty
service type
EMR
ABDM
operational status
data quality
```

Do not display private source contacts on marker popups.

---

# 72. DATA QUALITY SCREEN

Show actual detected source issues.

Example:

```text
DATA QUALITY

4 open issues

Invalid time
Facility: DDU2 RCH UPHC
Source: Invalid time format - 17:93

Invalid time
Facility: Dindoshi Vasahat UPHC
Source: Invalid time format - 17:73
```

The exact count must come from the importer, not hardcoded UI text.

---

# 73. DEMO MODE UX

Top-level indicator:

```text
DEMO MODE
```

For synthetic operational values:

```text
DEMO DATA
```

The demo mode may show a small persistent banner:

```text
Prototype environment — operational values are synthetic demo data.
```

---

# 74. AI FEATURES

AI is optional in the first implementation pass and must not block core workflow.

Implement after core deterministic logic works.

## 74.1 AI Care Navigator

Input:

```text
free-form user description
```

Output:

```text
structured intent
required service category
urgency suggestion
clarifying question if needed
```

Then deterministic Care Router selects facilities.

AI must never directly select a facility without the deterministic router.

## 74.2 AI Referral Summary

Generate a structured summary from existing encounter/triage/referral data.

Do not invent missing values.

## 74.3 AI Operations Assistant

Only answer analytics questions from actual database-derived metrics.

Examples:

```text
Which facilities have the most pending referrals?
Which referrals have been pending longest?
Which facilities have unresolved data-quality issues?
```

AI should be allowed to summarize, not alter records automatically.

---

# 75. ABDM ARCHITECTURE POSITIONING

Create an abstraction for:

```text
patient health identifier reference
consent
record access
provider/facility reference
```

The prototype must explicitly say:

```text
ABDM integration-ready architecture
```

It must not claim:

```text
Live ABDM integration
```

unless a real integration is actually implemented and authenticated.

---

# 76. API CLIENT ARCHITECTURE IN FRONTEND

Create:

```text
frontend/lib/api/client.ts
```

Provide:

```text
get
post
patch
delete
```

Inject auth automatically.

Standardize error handling.

Create domain clients:

```text
facilities.api.ts
patients.api.ts
triage.api.ts
appointments.api.ts
queues.api.ts
referrals.api.ts
followups.api.ts
analytics.api.ts
sync.api.ts
```

---

# 77. TANSTACK QUERY RULES

Use TanStack Query for server state.

Do not duplicate server state manually across many React contexts.

Example keys:

```text
['facilities', filters]
['facility', facilityId]
['appointments', userId]
['referral', referralId]
['referral-timeline', referralId]
['queue', facilityId]
['analytics-overview']
```

After mutations, invalidate relevant query keys.

---

# 78. FORM VALIDATION

Use Zod.

Reuse schemas when the same payload structure is used client/server if practical.

Validate:

```text
phone
coordinates
pincode
appointment time
patient fields
triage values
referral input
sync operation shape
```

---

# 79. ERROR UX

Every page needs:

```text
loading
empty
error
success
offline
```

Do not leave blank screens.

Examples:

```text
No appointments today.

Unable to load referrals.
Try again.

You're offline.
Your changes are saved locally.
```

---

# 80. OBSERVABILITY

Backend logs should include:

```text
timestamp
requestId
route
status code
duration
actorId if available
```

Use structured JSON logs if simple.

Do not log patient-sensitive content.

---

# 81. TESTING STRATEGY

## 81.1 Backend unit tests

Test:

```text
care router score
facility hour parser
triage rules
referral state machine
data-quality parser
sync idempotency
```

## 81.2 Backend integration tests

Use a real PostgreSQL/PostGIS test database in Docker.

Test:

```text
facility import
nearby search
appointment creation
queue token creation
referral creation
referral acceptance
follow-up creation
analytics
```

## 81.3 Frontend tests

Test:

```text
facility search
care router form
referral timeline
offline indicator
sync center
role-based route protection
```

## 81.4 End-to-end tests

Use Playwright.

Mandatory journey:

```text
login as citizen
→ find care
→ select facility
→ book appointment
→ login as frontline worker
→ open patient
→ perform triage
→ create referral
→ login as receiving facility admin/doctor
→ accept referral
→ book referral appointment
→ mark patient arrived
→ consult
→ create follow-up
→ login as district admin
→ verify analytics/referral changes
```

---

# 82. OFFLINE E2E TEST

Use browser network throttling/offline mode.

Scenario:

```text
load facility data online
↓
go offline
↓
search facility from cached/static data
↓
create referral draft
↓
verify operation appears in Sync Center
↓
restore network
↓
sync
↓
verify backend referral exists
↓
submit same operation again
↓
verify no duplicate
```

---

# 83. SOURCE DATA QUALITY TEST

Automated test must assert that importing the supplied JSON detects the known invalid time strings.

Do not hardcode the facility count of issues in the service unless the test also derives them from actual source data.

Expected classes:

```text
INVALID_TIME
```

At least the two invalid times in the supplied sample should be detected.

---

# 84. DATABASE TEST FIXTURES

Provide factories:

```text
makeDemoUser()
makeDemoPatient()
makeDemoFacility()
makeDemoAppointment()
makeDemoReferral()
makeDemoFollowup()
```

Factories must not require production credentials.

---

# 85. API TEST TOOLING

Provide:

```text
Postman collection or Bruno collection
```

Recommended file:

```text
docs/MahaSwasthya.postman_collection.json
```

Include the full core journey.

---

# 86. DEMO RESET STRATEGY

Command:

```bash
npm run demo:reset
```

or:

```bash
docker compose run --rm backend npm run demo:reset
```

Reset behavior:

```text
remove demo operational rows
retain imported facility source data
re-seed demo data
recreate demo journey
```

---

# 87. PERFORMANCE TARGETS

For the hackathon dataset size, reasonable targets are:

```text
facility nearby API: < 300 ms locally
standard CRUD API: < 500 ms locally
command overview API: < 700 ms locally
frontend initial interaction: responsive
```

These are engineering targets, not claims about production-scale capacity.

Do not prematurely optimize beyond these needs.

---

# 88. MOBILE PERFORMANCE TARGETS

The packaged app should:

```text
avoid loading giant JS libraries unnecessarily
lazy-load maps and charts
keep public facility JSON sanitized and compact
cache query results
avoid rendering hundreds of DOM rows at once
use virtualization for long lists if needed
```

---

# 89. FRONTEND BUNDLE GUIDELINES

Do not bundle:

```text
raw backend JSON
large hidden datasets
secrets
source system personal contacts
```

Bundle only sanitized public facility data required for offline access.

---

# 90. MOBILE NAVIGATION

Citizen bottom navigation:

```text
Home
Care
Referrals
Records
More
```

Frontline bottom navigation:

```text
Home
Patients
Triage
Referrals
Sync
```

Facility navigation:

```text
Overview
Queue
Appointments
Referrals
More
```

Desktop can use persistent sidebar navigation.

---

# 91. RESPONSIVE RULES

Mobile first.

Use:

```text
sm
md
lg
xl
```

Avoid hardcoded screen-specific magic values.

Forms should become stacked on small screens.

Tables should become cards or horizontal scroll where necessary.

Map panels should become full-screen drawers or sheets on mobile.

---

# 92. FRONTEND DATA SOURCES

A facility list component must be able to receive data from:

```text
API
IndexedDB
bundled source
```

It should not care where the data came from.

Use a repository abstraction:

```text
facilityRepository.search()
facilityRepository.nearby()
facilityRepository.getById()
```

Then the repository decides:

```text
online → API
offline → cache/static fallback
```

---

# 93. OFFLINE FACILITY LOCATION

Because facility geolocation exists in the source JSON, nearby public facilities can be calculated offline.

Implement a client-side haversine calculation for offline fallback only.

The authoritative online geospatial calculation remains PostGIS.

---

# 94. SOURCE SANITIZATION SCRIPT

Create:

```text
scripts/create-public-facility-dataset.ts
```

It should read the raw JSON and output:

```text
frontend/lib/data/mumbai-suburban.public.json
```

Strip:

```text
facContactPerName
facContactPerMiddleName
facContactPerSurname
facContactPerMobNo
facContactPerEmail
facAltContactPer*
facEmail if treated as private contact
facWebsite only if public-safe
crtUsr
lstUpdUsr
facilityPassword
private source identifiers not intended for public display
```

Keep only public facility information needed for navigation.

---

# 95. API PAGINATION

Use cursor or page/limit consistently.

Prototype recommendation:

```text
page
limit
```

Default:

```text
limit = 20
max = 100
```

For maps, use a bounded result count and viewport/radius filters.

---

# 96. API VERSIONING

All routes must live under:

```text
/api/v1
```

Do not mix `/api` and `/api/v1`.

---

# 97. REQUEST VALIDATION

Every POST/PATCH endpoint must use a Zod schema.

Required examples:

```text
createPatientSchema
createAppointmentSchema
createTriageSchema
createReferralSchema
syncPushSchema
facilitySearchSchema
```

Reject unknown/malformed data where practical.

---

# 98. ROLE MIDDLEWARE

Create:

```text
requireAuth()
requireRole(...roles)
requireFacilityAccess()
requirePatientAccess()
```

Do not rely on route hiding in Next.js as the security mechanism.

---

# 99. AUDIT RULES

Audit:

```text
patient creation
patient update
encounter completion
triage creation
referral creation
referral acceptance
referral rejection
referral completion
appointment creation/cancellation
consent grant/revoke
data-quality resolution
admin changes
```

---

# 100. PUBLIC API DATA MODEL

Public facility response should be deliberately smaller than the database model.

Recommended public object:

```json
{
  "id": "uuid",
  "name": "Dhanukarwadi UPHC",
  "facilityType": "Primary Health Centre",
  "serviceType": "OPD",
  "ownership": "GOVERNMENT",
  "pincode": "400067",
  "address": "Dahanukarwadi, Kandivali West",
  "location": {
    "latitude": 19.2070803,
    "longitude": 72.8376889
  },
  "specialties": [],
  "hours": [],
  "emrEnabled": false,
  "abdmEnabled": true,
  "operationalStatus": "FUNCTIONAL",
  "dataQualityScore": 92,
  "sourceLastUpdated": "2026-06-24T06:10:28.679Z"
}
```

Values must come from normalized data. Do not invent missing fields.

---

# 101. FACILITY STATUS NORMALIZATION

Map source codes to normalized labels.

Example:

```text
F → FUNCTIONAL
```

If the source code cannot be safely mapped:

```text
UNKNOWN
```

Document the mapping in code comments and docs.

---

# 102. SERVICE TYPE NORMALIZATION

Examples:

```text
OPD       → OPD
IPD       → IPD
OPD,IPD   → OPD + IPD
```

Do not infer additional services from facility name alone.

---

# 103. RESOURCE NORMALIZATION

Examples:

```text
"0"   → numeric 0
null  → null / UNKNOWN state
"12"  → numeric 12
```

Resource availability booleans should not be fabricated from null values.

---

# 104. FACILITY HOURS NORMALIZATION

Valid time regex:

```regex
^(?:[01]\d|2[0-3]):[0-5]\d$
```

If invalid:

```text
store null
retain sourceValue
create issue
```

---

# 105. NOTIFICATION TYPES

```text
APPOINTMENT_BOOKED
QUEUE_UPDATED
REFERRAL_CREATED
REFERRAL_ACCEPTED
REFERRAL_REJECTED
REFERRAL_APPOINTMENT
FOLLOWUP_DUE
SYNC_CONFLICT
SYSTEM
```

---

# 106. ANALYTICS COMPUTATION

Do not store every dashboard metric as mutable counters unless necessary.

Prefer SQL-derived metrics for correctness.

Cache expensive aggregates in Redis only if required.

---

# 107. REDIS USAGE

Redis is for:

```text
BullMQ
short-lived cache
SSE/pub-sub if used
rate limiting if desired
```

Do not store authoritative health records only in Redis.

---

# 108. POSTGIS USAGE

Use a geography point:

```text
POINT(longitude latitude)
```

SRID:

```text
4326
```

Be careful that latitude/longitude order is correct when constructing PostGIS points.

---

# 109. FACILITY MAP QUERY

Allow a bounding box or radius query.

Recommended endpoint:

```http
GET /api/v1/facilities/map?minLat=&minLng=&maxLat=&maxLng=
```

Avoid returning the entire database to the map client.

---

# 110. API CACHING

Safe cache candidates:

```text
public facility catalogue
facility specialties
facility hours
```

Short TTL:

```text
1–10 minutes
```

Do not cache personalized patient data in shared caches.

---

# 111. CORS

Development:

```text
http://localhost:3000
```

Capacitor production origin/config should be explicitly allowed as needed.

Do not use:

```text
*
```

in authenticated production-facing mode.

---

# 112. API RATE LIMITS

Suggested prototype limits:

```text
public facility endpoints: 120/min/IP
OTP send: 5/15 min/phone/IP
login attempts: 10/min/IP
sync: 60/min/device
```

Tune only if testing requires it.

---

# 113. AUTH TOKEN STRATEGY

Use short-lived access tokens.

Example prototype values:

```text
access token: 15 minutes
refresh token: 7 days
```

Use secure storage appropriate to browser/Capacitor.

For the browser prototype, prefer an httpOnly secure cookie architecture if feasible.

For native Capacitor, do not store long-lived secrets in local plain text.

---

# 114. ROLE DEMO ACCOUNTS

Create predictable demo login shortcuts in demo mode.

Example:

```text
Citizen      9000000001
Frontline    9000000002
Doctor       9000000003
FacilityAdmin 9000000004
DistrictAdmin 9000000005
```

OTP:

```text
123456
```

Do not use these accounts in production.

---

# 115. DEMO JOURNEY DATA

Create one primary journey whose facility is an actual imported Mumbai Suburban record.

Recommended starting location:

```text
Pincode: 400067
Latitude: 19.2070803
Longitude: 72.8376889
```

This corresponds to the imported Dhanukarwadi UPHC source record. fileciteturn0file0L784-L811

The receiving facility must be another imported facility whose normalized specialty/service data is suitable for the synthetic scenario; if the real dataset does not support the desired specialty in a given scenario, use a second synthetic demonstration capability overlay and label it as demo data rather than falsifying source records.

---

# 116. DEMO SCENARIOS

Create at least three scenarios.

## Scenario A — General care to referral

```text
Patient
→ primary care
→ triage
→ referral
→ receiving facility
→ appointment
→ consult
→ follow-up
```

## Scenario B — Maternal follow-up

```text
Patient
→ maternal service selection
→ obstetrics facility
→ appointment
→ follow-up
```

## Scenario C — Offline frontline visit

```text
worker online
→ cache facility data
→ disconnect network
→ create patient draft
→ perform triage draft
→ create referral draft
→ reconnect
→ sync
→ district dashboard sees referral
```

---

# 117. DEMO SCRIPT

The app should support this exact presentation:

1. Open Citizen app.
2. Choose language.
3. Choose `Find Care`.
4. Allow/mock location.
5. Enter a simple care need.
6. Show explainable ranked facilities.
7. Select a public facility.
8. Book a token.
9. Switch role to frontline worker.
10. Open patient.
11. Complete triage.
12. Create referral.
13. Switch to receiving facility.
14. Accept referral.
15. Schedule/confirm referral appointment.
16. Mark patient arrived.
17. Complete consultation.
18. Create follow-up.
19. Return to citizen app.
20. Show referral timeline.
21. Open district command center.
22. Show updated referral/follow-up metrics.
23. Show Data Quality Center.
24. Demonstrate offline mode.
25. Disconnect network.
26. Find facility from local catalogue.
27. Create referral draft.
28. Reconnect.
29. Sync.
30. Show successful synchronization.

---

# 118. BROWSER QA CHECKLIST

For each major route verify:

```text
page loads
no console errors
no hydration errors
no unhandled promise rejections
mobile layout works
desktop layout works
empty state works
error state works
loading state works
keyboard focus works
```

---

# 119. TYPESCRIPT QUALITY

Use:

```text
strict: true
noImplicitAny: true
```

Do not use `any` unless narrowly justified.

Use domain types for API responses.

---

# 120. LINT / FORMAT

Use ESLint and Prettier.

Scripts:

```bash
npm run lint
npm run format:check
npm run typecheck
```

---

# 121. PACKAGE MANAGER

Use npm unless the workspace already mandates another package manager.

Reason: minimize agent/runtime friction.

Lockfile must be committed.

---

# 122. BACKEND STARTUP SCRIPTS

Recommended:

```json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "worker": "node dist/worker.js",
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "test": "vitest run",
  "test:integration": "vitest run tests/integration",
  "data:import": "tsx scripts/import-hfr-json.ts",
  "demo:seed": "tsx scripts/generate-demo-data.ts",
  "demo:reset": "tsx scripts/reset-demo.ts"
}
```

Adapt commands to the exact chosen test runner if necessary, but preserve equivalent functionality.

---

# 123. FRONTEND STARTUP SCRIPTS

Recommended:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "e2e": "playwright test",
  "cap:sync": "cap sync",
  "cap:android": "cap open android"
}
```

Use the commands supported by the installed Next.js version.

---

# 124. FRONTEND ENVIRONMENT

Example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_APP_NAME=MahaSwasthya Grid
NEXT_PUBLIC_DEMO_MODE=true
```

Never embed backend secrets in `NEXT_PUBLIC_*` variables.

---

# 125. MAP PROVIDER

Use a provider that works without proprietary API keys if practical for the prototype.

Important:

- map tiles require internet in normal operation;
- facility search must still work offline;
- offline mode may show a simplified list instead of a full map;
- never make the map the only way to find care.

---

# 126. ERROR CODES

Create stable machine-readable error codes.

Examples:

```text
AUTH_REQUIRED
FORBIDDEN
VALIDATION_ERROR
FACILITY_NOT_FOUND
PATIENT_NOT_FOUND
APPOINTMENT_NOT_FOUND
APPOINTMENT_SLOT_INVALID
FACILITY_CLOSED
FACILITY_HOURS_UNKNOWN
REFERRAL_NOT_FOUND
INVALID_REFERRAL_STATE_TRANSITION
QUEUE_NOT_FOUND
SYNC_CONFLICT
DUPLICATE_OPERATION
DATA_QUALITY_ISSUE
DEMO_MODE_DISABLED
```

---

# 127. RESPONSE PAGINATION FORMAT

```json
{
  "success": true,
  "data": {
    "items": []
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "pages": 5
  }
}
```

---

# 128. DATA OWNERSHIP RULES

Each module owns its business logic.

Examples:

```text
Referrals own referral state transitions.
Queues own queue state.
Appointments own appointment state.
Facilities own facility source data.
Sync owns synchronization state.
```

Do not allow arbitrary modules to directly mutate another domain's state.

---

# 129. DOMAIN SERVICE EXAMPLES

## ReferralService

Methods:

```text
createReferral()
getReferral()
acceptReferral()
rejectReferral()
bookReferralAppointment()
markArrived()
markConsulted()
completeReferral()
getTimeline()
```

## FacilitySearchService

```text
findNearby()
search()
getMapFacilities()
getFacilityDetails()
```

## CareRoutingService

```text
determineNeed()
findCandidates()
scoreCandidate()
explainCandidate()
recommend()
```

## SyncService

```text
push()
processOperation()
checkIdempotency()
resolveConflict()
pullChanges()
```

---

# 130. API FLOW — CITIZEN

```text
Citizen App
  │
  ├── GET /facilities/nearby
  │        ↓
  │     FacilitySearchService
  │        ↓
  │     PostGIS
  │
  ├── POST /care-routing/recommend
  │        ↓
  │     CareRoutingService
  │        ↓
  │     FacilitySearchService
  │
  ├── POST /appointments
  │        ↓
  │     AppointmentService
  │        ↓
  │     QueueService
  │        ↓
  │     NotificationService
  │
  └── GET /referrals/:id/timeline
           ↓
        ReferralService
```

---

# 131. API FLOW — FRONTLINE

```text
Frontline App
  │
  ├── POST /patients
  ├── POST /encounters
  ├── POST /triage
  │       ↓
  │   TriageService
  │
  └── POST /referrals
          ↓
      ReferralService
          ↓
      referral event
          ↓
      notification job
```

---

# 132. API FLOW — RECEIVING FACILITY

```text
GET /referrals
     ↓
POST /referrals/:id/accept
     ↓
POST /referrals/:id/appointment
     ↓
POST /referrals/:id/arrive
     ↓
POST /referrals/:id/consult
     ↓
POST /referrals/:id/complete
```

Every action creates a timeline event where appropriate.

---

# 133. API FLOW — DISTRICT ADMIN

```text
GET /analytics/overview
GET /analytics/facilities
GET /analytics/referrals
GET /analytics/followups
GET /analytics/data-quality
GET /facilities/map
```

No patient-level clinical detail should be exposed unless explicitly authorized and needed; the command center should primarily operate on aggregated operational indicators.

---

# 134. API FLOW — OFFLINE

```text
UI action
  ↓
repository
  ↓
offline?
  ├─ no → API
  └─ yes
       ↓
    IndexedDB
       ↓
    syncQueue
       ↓
    network returns
       ↓
    POST /sync/push
       ↓
    server transaction
       ↓
    ACK
       ↓
    remove queue item
```

---

# 135. AUDIT FLOW

```text
Controller
  ↓
Service
  ↓
mutation
  ↓
auditService.record()
```

Do not make audit logging the only source of business events; referral/appointment events have domain-specific event tables too.

---

# 136. SOURCE DATA VERSIONING

When importing the source dataset:

```text
calculate SHA-256 checksum
store import timestamp
store source file name
store record count
```

Create an `ImportRun` model if useful:

```text
id
sourceName
checksum
recordCount
startedAt
completedAt
status
errorMessage
```

This makes the data lineage more credible.

---

# 137. IMPORT RUN MODEL (RECOMMENDED)

```text
ImportRun
---------
id UUID PK
sourceName
checksum
recordCount
status
startedAt
completedAt
errorMessage nullable
```

Each `FacilitySnapshot` can optionally reference `ImportRun`.

---

# 138. DATA LINEAGE UI

Data Quality Center should show:

```text
Source: mumbai-suburban.json
Imported: <timestamp>
Records: 10
Status: SUCCESS
Issues detected: <dynamic count>
```

Do not claim the source is live if it is a file import.

---

# 139. DEMO INVENTORY

Synthetic inventory values should be plausible but clearly synthetic.

Example:

```text
Paracetamol 500 mg
Quantity: 240
Status: AVAILABLE

ORS sachets
Quantity: 100
Status: AVAILABLE
```

These are demonstration records only.

---

# 140. DIAGNOSTIC DEMO DATA

Example:

```text
CBC
status AVAILABLE

Blood glucose
status AVAILABLE

Ultrasound
status UNKNOWN
```

Do not claim the source dataset confirms these capabilities unless it does.

---

# 141. FACILITY CAPABILITY MODEL

Do not infer capability from a facility name.

Capability must derive from:

```text
specialty
source service type
source resource information
synthetic demo capability overlay
```

If an overlay is used, mark it:

```text
demoData = true
```

---

# 142. DEMO CAPABILITY OVERLAY

If the source dataset lacks enough information to complete a polished demo, add an explicit prototype-only table:

```text
FacilityDemoCapability
----------------------
id
facilityId
specialty
service
queueCapacity
demoData
```

This is preferable to mutating the imported source values.

---

# 143. SOURCE VS DEMO UI

Facility detail page should show badges such as:

```text
SOURCE DATA
DEMO OPERATIONAL DATA
UNKNOWN
```

This reinforces trust.

---

# 144. HEALTHCARE CONTENT SAFETY

The application should never provide:

```text
specific drug prescriptions
personalized medication doses
definitive diagnosis
false emergency reassurance
```

Use neutral navigation language:

```text
clinical assessment recommended
priority assessment recommended
seek urgent professional care
```

---

# 145. ACCESSIBILITY / LANGUAGE DATA MODEL

User:

```text
preferredLanguage
```

Supported:

```text
en
hi
mr
```

Store translations in frontend resources.

---

# 146. NOTIFICATION DELIVERY

Prototype channels:

```text
in-app
```

Optional adapters:

```text
email
SMS
WhatsApp
push
```

Do not integrate paid external services unless credentials are already available and the implementation is genuinely needed.

---

# 147. PWA REQUIREMENTS

Implement:

```text
manifest
service worker
offline shell
icons
standalone display
```

The service worker must not cache authenticated API responses in a way that risks cross-user data leakage.

---

# 148. CACHE STRATEGY

Cache:

```text
static assets
public facility catalogue
non-sensitive public facility detail data
```

Network-first or stale-while-revalidate where appropriate.

Do not blindly cache:

```text
patient records
medical notes
consent records
```

unless they are stored in a properly scoped offline vault/cache for the current user.

---

# 149. MOBILE SECURITY

For Capacitor:

- never ship backend database credentials;
- never ship JWT signing secrets;
- do not hardcode admin access tokens;
- minimize persistent sensitive data;
- clear sensitive offline cache on logout where appropriate;
- use secure native storage for refresh credentials if using native auth storage.

---

# 150. LOGOUT BEHAVIOR

On logout:

```text
clear auth state
clear sensitive query cache
clear sensitive IndexedDB records for that user
retain only public facility data
```

If there are unsynced sensitive changes, warn the user and preserve them only according to the offline safety policy.

---

# 151. FIRST IMPLEMENTATION PHASE

The agent must first implement:

```text
Docker Compose
PostgreSQL/PostGIS
Redis
Express
Prisma
migrations
health endpoints
source JSON import
facility search
facility map API
```

Then test them.

Do not start frontend before backend contracts exist.

---

# 152. SECOND IMPLEMENTATION PHASE

Implement:

```text
auth
users
patients
encounters
triage
appointments
queue
```

Test each module before continuing.

---

# 153. THIRD IMPLEMENTATION PHASE

Implement:

```text
referrals
referral events
followups
notifications
```

Run the complete care workflow.

---

# 154. FOURTH IMPLEMENTATION PHASE

Implement:

```text
analytics
data quality
sync
offline APIs
```

---

# 155. FIFTH IMPLEMENTATION PHASE

Build Next.js pages for:

```text
Citizen
Frontline
Facility
Command Center
```

Use the backend API rather than mock data except for explicitly labeled demo operations.

---

# 156. SIXTH IMPLEMENTATION PHASE

Implement:

```text
IndexedDB
offline facility fallback
sync manager
PWA
Capacitor config
```

---

# 157. SEVENTH IMPLEMENTATION PHASE

Add optional:

```text
AI Care Navigator
AI Referral Summary
AI Operations Assistant
```

Only after all deterministic workflows pass.

---

# 158. EIGHTH IMPLEMENTATION PHASE

Polish:

```text
loading states
empty states
error states
accessibility
mobile navigation
animations
charts
map interactions
visual consistency
```

---

# 159. FINAL BUILD ORDER

The agent must execute in this order:

```text
1. Inspect workspace
2. Inspect source JSON
3. Create monorepo folders
4. Create Docker Compose
5. Create backend project
6. Add Prisma/PostGIS
7. Add migrations
8. Import source dataset
9. Implement facility APIs
10. Add backend tests
11. Implement auth
12. Implement patients/encounters
13. Implement triage
14. Implement appointments/queue
15. Implement referrals
16. Implement follow-ups
17. Implement analytics
18. Implement data quality
19. Implement sync
20. Build frontend shell
21. Build citizen flow
22. Build frontline flow
23. Build facility flow
24. Build command center
25. Build offline layer
26. Add PWA
27. Add Capacitor
28. Add optional AI
29. Run automated tests
30. Run browser tests
31. Run offline tests
32. Reset demo and rerun
33. Build all Docker images
34. Verify clean startup from zero
35. Write README and demo guide
```

---

# 160. NO-QUESTION FALLBACK POLICY

If the agent encounters ambiguity:

### Naming ambiguity
Use the naming in this document.

### Database implementation ambiguity
Prefer Prisma + PostgreSQL.

### Offline storage ambiguity
Use IndexedDB through Dexie.

### Mobile packaging ambiguity
Use Capacitor.

### Map ambiguity
Use an open-compatible map library with client rendering.

### Real-time ambiguity
Use SSE before adding WebSockets.

### Queue ambiguity
Use BullMQ + Redis.

### AI ambiguity
Skip AI until deterministic workflows work.

### External service ambiguity
Use a local/mock adapter.

### Data ambiguity
Store as `UNKNOWN`, not as an invented value.

### Health-data ambiguity
Do not invent medical facts.

---

# 161. FAILURE RECOVERY POLICY FOR THE AGENT

If a build/test fails:

```text
read error
identify root cause
fix minimal layer
rerun failed test
rerun dependent tests
continue
```

Do not disable tests merely to make the pipeline green.

Do not suppress TypeScript errors with `@ts-ignore` unless unavoidable and documented.

Do not comment out failing features.

---

# 162. DOCKER CLEAN-ROOM TEST

Before final completion, execute:

```bash
docker compose down -v

docker compose build --no-cache

docker compose up -d
```

Wait until:

```text
postgres healthy
redis healthy
backend ready
frontend responding
worker running
```

Then run:

```bash
docker compose exec backend npm run test
```

and:

```bash
npm run e2e
```

or the equivalent inside a dedicated test container.

---

# 163. DOCKER DATA PERSISTENCE TEST

Verify:

```text
docker compose down

docker compose up -d
```

and confirm imported facility records persist.

---

# 164. SOURCE IMPORT REPEAT TEST

Run importer twice.

Expected:

```text
facility count unchanged
specialty count logically unchanged
hours logically unchanged
resource rows logically unchanged
```

No duplicates.

---

# 165. SYNC DUPLICATION TEST

Submit the same operation twice.

Expected:

```text
one server entity
one authoritative result
no duplicate referral
```

---

# 166. ROLE SECURITY TEST

Attempt:

```text
Citizen → district analytics
Citizen → accept referral
Frontline → district admin mutation
```

Expected:

```text
403 FORBIDDEN
```

---

# 167. DATA PRIVACY TEST

Call public facility endpoint.

Assert it does not contain:

```text
source contact personal name
source personal mobile number
source personal email
```

---

# 168. OFFLINE TEST

Disable network.

Verify:

```text
facility discovery still works
public cached data still works
offline indicator appears
local draft is saved
sync queue appears
```

Do not claim server-side confirmation while offline.

---

# 169. ACCESSIBILITY TEST

Run automated accessibility testing with axe or equivalent.

Resolve all critical/serious issues.

Manually test:

```text
keyboard navigation
focus visibility
screen reader labels
mobile touch targets
high contrast
font scaling
```

---

# 170. BROWSER RESPONSIVE TEST

Test at approximately:

```text
375 × 812
390 × 844
768 × 1024
1280 × 800
1440 × 900
```

The app must remain usable.

---

# 171. FRONTEND ROUTE GUARDS

Role-specific pages must redirect unauthorized users.

Example:

```text
/citizen/* → CITIZEN
/frontline/* → FRONTLINE_WORKER
/facility/* → FACILITY_ADMIN/DOCTOR
/command/* → DISTRICT_ADMIN/SUPER_ADMIN
```

Server/API authorization remains authoritative.

---

# 172. FRONTEND DEMO LOGIN

In demo mode:

```text
Select role
Enter demo phone
OTP 123456
```

This is purely for the hackathon prototype.

---

# 173. API DOCUMENTATION

Generate OpenAPI documentation.

Endpoint:

```http
GET /api/docs
```

or static:

```text
docs/openapi.json
```

Document:

```text
request payload
response payload
auth requirements
role requirements
error codes
```

---

# 174. DATABASE DOCUMENTATION

Add:

```text
docs/data-model.md
```

Include ERD if possible.

---

# 175. ARCHITECTURE DOCUMENTATION

Add:

```text
docs/architecture.md
```

Include:

```text
system diagram
data flow
offline flow
sync flow
referral state machine
care router logic
```

---

# 176. DEMO DOCUMENTATION

Add:

```text
docs/demo-script.md
```

Include:

```text
setup
login accounts
scenario
expected screen transitions
reset command
```

---

# 177. README REQUIREMENTS

README must contain:

```text
project overview
features
architecture
stack
Docker setup
environment variables
database migrations
seed/import commands
API docs
frontend
Capacitor build notes
offline behavior
security note
demo guide
known limitations
```

---

# 178. KNOWN LIMITATIONS TO DOCUMENT

The prototype must explicitly document that:

```text
facility data comes from the supplied JSON snapshot
operational queue/appointment/inventory values are synthetic demo data
ABDM is architecture-ready but not necessarily live-integrated
SMS/WhatsApp delivery may be mocked
clinical triage is decision support, not diagnosis
map availability depends on network unless cached map data is added
```

---

# 179. FUTURE EXTENSIONS

Do not implement unless time allows:

```text
live government facility API synchronization
ABDM real integration
FHIR interoperability
SMS/WhatsApp production messaging
real lab information systems
real medicine logistics
vehicle/ambulance routing
voice IVR
ASHA incentive workflows
advanced district forecasting
```

---

# 180. OPTIONAL FHIR ABSTRACTION

If easy, create domain-to-FHIR mapping adapters without exposing them in the core UI.

Suggested conceptual mappings:

```text
Patient → Patient
Encounter → Encounter
Appointment → Appointment
Observation/vitals → Observation
Referral → ServiceRequest / referral abstraction
Medication → Medication / MedicationRequest abstraction
```

Do not claim standards compliance merely because classes are named after FHIR resources. Only claim actual conformance if validated.

---

# 181. COMMAND CENTER ALERT LOGIC

Generate alerts for:

```text
high-risk follow-up due
referral pending too long
facility data-quality issue
operational hour missing
queue threshold exceeded
sync failure
```

Prototype configurable thresholds:

```text
referral pending > 24h → WARNING
high-risk follow-up due → HIGH
queue estimated wait > 90m → WARNING
```

These are demo operational thresholds.

---

# 182. REFERRAL SLA DEMONSTRATION

Track:

```text
time created
time accepted
time appointment booked
time arrived
time consulted
time completed
```

Compute:

```text
acceptance time
appointment time
completion time
```

This helps demonstrate accountability.

---

# 183. PATIENT JOURNEY TIMELINE DATA

The endpoint:

```http
GET /patients/:id/timeline
```

should merge:

```text
appointments
encounters
triage
referrals
referral events
follow-ups
```

Sort chronologically.

The result becomes the source for the citizen “My Care Journey” screen.

---

# 184. CARE JOURNEY RESPONSE

Example:

```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "p1",
      "patientCode": "MH-P-001"
    },
    "events": [
      {
        "type": "APPOINTMENT",
        "status": "COMPLETED",
        "date": "2026-09-10T09:00:00Z"
      },
      {
        "type": "REFERRAL",
        "status": "ACCEPTED",
        "date": "2026-09-10T11:20:00Z"
      }
    ]
  }
}
```

---

# 185. DISTRICT MAP DATA RESPONSE

Map response must contain only the minimum display data:

```json
{
  "id": "f1",
  "name": "Facility A",
  "lat": 19.2,
  "lng": 72.8,
  "facilityType": "Primary Health Centre",
  "status": "FUNCTIONAL",
  "specialties": ["General Medicine"]
}
```

---

# 186. MOBILE MAP FALLBACK

When offline:

```text
Map unavailable offline.

Show list sorted by distance.
```

This is preferable to shipping huge map tiles.

---

# 187. GEOLOCATION PERMISSION FAILURE

If location permission is denied:

```text
Use pincode
```

Input:

```text
400067
```

Then use geocoded facility/source records for matching.

Do not require device location for basic search.

---

# 188. PRIVACY / CONSENT UX

Show a simple consent dialog before sharing a patient record in a workflow that requires it.

Example:

```text
Share care information with receiving facility?

Purpose: Specialist referral
Scope: Current encounter + referral summary

[ Allow ] [ Cancel ]
```

Record the consent event in the database.

---

# 189. PATIENT IDENTIFIERS

Use:

```text
internal UUID
patientCode
```

Example:

```text
MH-P-000123
```

Do not put names into URL paths.

---

# 190. DEMO PATIENT DATA EXPOSURE

The demo must use names that are explicitly synthetic.

A banner in demo mode is recommended:

```text
All patient records in this prototype are synthetic demo data.
```

---

# 191. SQL / PRISMA SPATIAL STRATEGY

Prisma may not expose all PostGIS operations cleanly through the normal client.

Use:

```text
Prisma.$queryRaw
```

for geospatial read operations where required.

Keep raw SQL isolated inside:

```text
facilities.repository.ts
```

or:

```text
db/queries/facility.geo.sql.ts
```

Validate all dynamic values through typed parameters.

---

# 192. POSTGIS ENABLEMENT

Migration must run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Verify:

```sql
SELECT PostGIS_Version();
```

Add this to readiness diagnostics.

---

# 193. DATABASE SEED SAFETY

Seed scripts must distinguish:

```text
source data
synthetic data
```

A reset should never destroy the source catalogue unless explicitly asked.

---

# 194. SOURCE RECORD IMMUTABILITY

Never directly edit a source snapshot to “fix” it.

Instead:

```text
sourceSnapshot
    ↓
normalization
    ↓
quality issue
    ↓
optional admin override
```

Store overrides separately if implemented.

---

# 195. FACILITY ADMIN OVERRIDE MODEL (OPTIONAL)

If the agent implements it, use:

```text
FacilityOverride
----------------
id
facilityId
fieldName
value
reason
changedBy
createdAt
```

Then display:

```text
Source value
Override value
Reason
```

Do not overwrite source data.

---

# 196. QUALITY SCORE INTERPRETATION

Use labels:

```text
90–100 Excellent
75–89 Good
50–74 Needs attention
0–49 Poor
```

These are prototype labels only.

---

# 197. ANALYTICS DEMO FILTERS

District admin can filter by:

```text
facility
facility type
specialty
date range
referral status
follow-up status
```

---

# 198. CHARTS

Use Recharts.

Required charts:

```text
Referral funnel
Referral completion trend
Follow-up completion
Facility workload
Data quality issue distribution
```

Do not create decorative charts with no data meaning.

---

# 199. EMPTY STATE RULES

Examples:

```text
No referrals found.

No follow-ups due today.

No queue entries.

No data-quality issues.
```

Do not hide empty states by showing arbitrary demo numbers unless the page is explicitly in demo mode.

---

# 200. SEARCH UX

Use shadcn `Command` for rapid facility search.

Support:

```text
name
pincode
specialty
area
```

---

# 201. FORM UX

Use:

```text
React Hook Form
Zod
shadcn Form
```

Display inline validation.

Do not make forms unnecessarily long.

---

# 202. LOADING UX

Use skeletons for:

```text
facility cards
command center metrics
referral timeline
queue
```

Use optimistic updates only for reversible local UI state; do not show fake confirmed server actions.

---

# 203. OFFLINE SYNC CONFLICT UX

Example:

```text
Could not sync this action.

The referral was already completed by another user.

[ Review ]
```

Do not silently discard the user's work.

---

# 204. API REQUEST CORRELATION

Every API request gets:

```text
x-request-id
```

If client supplies one, validate/sanitize it.

Return it in headers and logs.

---

# 205. ERROR HANDLER

Global Express middleware:

```text
ValidationError
AuthError
ForbiddenError
NotFoundError
ConflictError
DomainError
unknown Error
```

Map to HTTP codes:

```text
400 validation
401 auth
403 forbidden
404 not found
409 conflict
422 domain validation
429 rate limit
500 server
```

---

# 206. REQUEST BODY LIMIT

Set a reasonable JSON limit:

```text
1 MB
```

The source JSON import should not be exposed through an HTTP request endpoint.

---

# 207. FILE INGESTION

Do not build arbitrary user file upload into the public prototype.

The source JSON is a developer/admin asset.

---

# 208. DEMO DATA GENERATION RULE

Synthetic data must reference real imported facilities where possible.

This creates realistic joins without corrupting source data.

Example:

```text
patient → actual imported facility
appointment → actual imported facility
referral source → actual imported facility
```

---

# 209. COMMAND CENTER DEMO DATA GENERATION

Generate varied values:

```text
some low wait
some high wait
some pending referrals
some completed referrals
some follow-ups due
some data quality issues
```

This makes charts meaningful.

---

# 210. SOURCE DATA CARD

Facility detail page should show:

```text
Data source
HFR

Last source update
<timestamp>

Data quality
92/100
```

If values are unknown:

```text
Unknown
```

not:

```text
Unavailable
```

unless the source explicitly says unavailable.

---

# 211. PUBLIC FACILITY SEARCH EDGE CASES

Handle:

```text
no coordinates
invalid coordinates
radius too small
radius too large
no matches
missing specialty
unknown hours
closed facility
```

---

# 212. APPOINTMENT EDGE CASES

Handle:

```text
duplicate booking
past date
invalid time
facility closed
capacity exceeded
cancelled appointment
no-show
```

---

# 213. REFERRAL EDGE CASES

Handle:

```text
unknown destination
already accepted
already completed
invalid transition
rejected referral
cancelled referral
```

---

# 214. SYNC EDGE CASES

Handle:

```text
duplicate operation
network timeout
server 500
validation error
conflict
stale entity
```

Retry only transient failures.

Do not repeatedly retry deterministic validation failures.

---

# 215. RETRY POLICY

For network/server errors:

```text
attempt 1 immediately
attempt 2 after 1s
attempt 3 after 3s
attempt 4 after 10s
```

Then leave operation pending/failed for manual retry.

---

# 216. FRONTEND OFFLINE DETECTION

Use:

```text
navigator.onLine
window online/offline events
```

and optionally Capacitor Network plugin when running natively.

Treat `navigator.onLine=true` as a hint, not proof that the backend is reachable.

Actual API connectivity should be verified by request behavior.

---

# 217. NETWORK HEALTH

Add small client state:

```text
ONLINE
DEGRADED
OFFLINE
```

`DEGRADED` can represent connectivity where requests are failing intermittently.

---

# 218. FRONTEND AUTH + OFFLINE

On app startup:

```text
load local auth session if safe
check backend connectivity
show cached public data
sync pending mutations
```

Do not assume an expired authentication token remains valid offline.

---

# 219. DEMO LOGIN EXPIRATION

In demo mode, authentication may use deterministic local accounts but the backend still validates the user role on every protected API request.

---

# 220. NEXT.JS SERVER VS CLIENT BOUNDARIES

Use server components where useful for static/public pages, but interactive app surfaces can be client components.

Map, geolocation, IndexedDB, Capacitor APIs, and offline state must be in client components/modules.

Do not import browser-only libraries into server components.

---

# 221. HYDRATION SAFETY

For values such as:

```text
current time
online status
geolocation
IndexedDB data
Capacitor APIs
```

load them after client hydration.

Avoid rendering different server/client initial DOM based on browser-only state.

---

# 222. MOBILE PERSISTENCE

Use IndexedDB for structured data.

Use native secure storage only for credential secrets where appropriate.

Do not use localStorage for entire patient records.

---

# 223. MOBILE APP SIZE

Keep bundle size controlled.

Do not import entire heavyweight libraries for tiny utilities.

Lazy-load:

```text
maps
charts
AI interface
admin analytics
```

---

# 224. CAPACITOR BUILD CHECK

The agent should at least verify:

```bash
npx cap sync
```

and ensure that the web assets are copied successfully.

If an Android SDK is available, run the Android build.

If it is not available, do not claim the native binary was built; document that only Capacitor sync was verified.

---

# 225. WEB BUILD CHECK

Run:

```bash
npm run build
```

and verify no unsupported server runtime assumptions prevent packaging.

---

# 226. MOBILE ROUTING CHECK

Verify every packaged route works under the chosen Capacitor routing strategy.

If direct filesystem/static hosting changes route behavior, implement the routing fallback necessary for the chosen build mode.

---

# 227. DEMO-FIRST FEATURE PRIORITY

Priority 1:

```text
facility map/search
care router
referral timeline
offline worker mode
command center
```

Priority 2:

```text
appointments
queue
followups
data quality
```

Priority 3:

```text
AI
inventory
diagnostics
advanced analytics
```

---

# 228. DO NOT OVERBUILD

Do not implement:

```text
billing
insurance claims
complex pharmacy management
full hospital ERP
full EMR
real clinical decision support model
complex inventory procurement
```

These dilute the core SIH problem.

---

# 229. DEMO STORY

The product story should be:

```text
A patient should not have to understand the healthcare system
in order to access it.

MahaSwasthya Grid turns fragmented public-care access into a connected journey.
```

---

# 230. SUCCESS METRICS FOR THE PROTOTYPE

Display prototype-level indicators:

```text
care navigation completion
referral acceptance time
referral completion rate
follow-up completion rate
estimated waiting time
facility data quality score
offline actions synchronized
```

Never call these “official Maharashtra health statistics.”

---

# 231. FINAL QUALITY BAR

The finished application should feel like a coherent public-health operating product, not:

```text
CRUD demo
hospital directory
AI chatbot
booking clone
```

The key visual and technical storyline is:

```text
ACCESS
  ↓
ROUTING
  ↓
CONTINUITY
  ↓
ACCOUNTABILITY
```

---

# 232. REQUIRED FILES AT COMPLETION

The repository must contain at minimum:

```text
MASTER_PLAN.md
README.md
.env.example
docker-compose.yml
backend/Dockerfile
frontend/Dockerfile
backend/prisma/schema.prisma
backend/prisma/seed.ts
backend/scripts/import-hfr-json.ts
backend/scripts/generate-demo-data.ts
backend/scripts/reset-demo.ts
docs/architecture.md
docs/api.md
docs/demo-script.md
docs/security.md
```

---

# 233. FINAL VALIDATION COMMANDS

The agent should run and succeed with equivalents of:

```bash
git status
npm --version
docker --version
docker compose version
```

Then:

```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

Then:

```bash
docker compose ps
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

Then run tests.

Then perform browser smoke tests.

Then perform the complete demo flow.

Then test offline.

Then reset demo and repeat.

---

# 234. FINAL AGENT REPORT

When the implementation is complete, produce a final machine-readable or human-readable summary containing:

```text
Build status
Docker status
Database migration status
Source import status
Source record count
Data-quality issue count
Backend test status
Frontend test status
E2E status
Offline sync status
Capacitor sync status
Known limitations
Exact startup command
Exact demo reset command
```

Do not claim anything as passed unless it was actually executed.

---

# 235. ABSOLUTE RULE: DO NOT FABRICATE SUCCESS

The agent must never say:

```text
all tests pass
Docker works
Capacitor works
```

unless it actually ran those checks.

If a feature cannot be tested in the available environment, state exactly what was tested and what was not.

---

# 236. SOURCES / IMPLEMENTATION NOTES

## Source dataset

Primary project data source:

```text
mumbai-suburban.json
```

This is the user-provided dataset for this prototype.

## Capacitor

Official Capacitor documentation describes Capacitor as a cross-platform native runtime for web apps and states that it can be added to existing modern JavaScript projects. Reference: https://capacitorjs.com/docs and https://next.capacitorjs.com/docs

## PostGIS Docker

The official `postgis/postgis` Docker image provides PostgreSQL with PostGIS installed and documents the compatible tags and PostgreSQL data directory differences. Reference: https://hub.docker.com/r/postgis/postgis/

---

# 237. FINAL INSTRUCTION TO THE AUTONOMOUS AGENT

Build the system described in this document from the current workspace.

Use the supplied `mumbai-suburban.json` as the source facility dataset.

Create any missing directories and files.

Create `.env.example`; create a local `.env` only when necessary for execution and never commit secrets.

Dockerize every runtime service.

Do not ask questions.

Do not stop at scaffolding.

Do not fabricate data provenance.

Do not fabricate clinical conclusions.

Do not fabricate test results.

Build, run, test, repair, and verify the entire prototype.

The final deliverable is a working Dockerized public-health access and continuity platform that can be demonstrated end-to-end offline and online.

**End state:**

```text
Citizen
  → Care Router
  → Public Facility
  → Appointment / Queue
  → Frontline Assessment
  → Referral
  → Receiving Facility
  → Follow-up
  → District Command Center
  → Data Quality

and

Online
  ⇄
IndexedDB Offline State
  ⇄
Sync API
  ⇄
PostgreSQL/PostGIS
```

