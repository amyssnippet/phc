# MahaSwasthya Grid — Phase 2 Fix & Multi-PHC Architecture Plan

## Purpose

Phase 2 converts the current prototype into a properly isolated multi-role, multi-facility public healthcare network.

The current prototype demonstrates the visual concept well, but Phase 2 must treat authorization, data isolation, patient privacy, separate application shells, and facility-scoped OPD queues as first-class backend concerns.

The core principle is:

> A UI hiding a record is not security. The API and database access path must make the record inaccessible to an unauthorized role.

Phase 2 must be completed without asking the project owner clarification questions. Make the decisions specified in this document and implement them consistently.

---

# 1. Problems to Fix

## 1.1 Patient data leakage

Current behavior allows a citizen/patient session to navigate to or retrieve another patient's record.

This is unacceptable.

Every patient-specific endpoint must apply server-side authorization. IDs in URLs are never treated as permission.

Bad:

GET /patients/:id -> return patient

Correct:

GET /patients/:id
    -> authenticate
    -> resolve actor role
    -> calculate authorization scope
    -> verify patient is inside actor scope
    -> return minimum necessary data

The server must return 403 for an authenticated user without access and 404 where resource enumeration should be avoided.

Never rely only on React route guards.

---

## 1.2 The current application shell is not sufficiently separated by role

The public citizen experience and workforce experience must be treated as separate application surfaces.

Create two logical application shells:

1. Citizen App
2. Workforce Portal

They may share components and API clients, but their navigation, authentication context, route guards, permissions, and data contracts must be separate.

### Citizen App

Audience:
- Citizens / patients

Primary purpose:
- Find care
- Book appointment/token
- View own appointments
- View own referrals
- View own care timeline
- View own follow-ups
- Manage consent/profile
- Receive notifications

### Workforce Portal

Audience:
- CHW / ASHA / ANM
- Doctor / Medical Officer
- Facility Admin
- District Health Officer
- Super Admin

Primary purpose:
- Patient registration
- Patient care workflow
- Triage
- Queue management
- Referrals
- Facility operations
- District analytics
- Data quality

The public citizen app must never expose workforce screens merely because a role switcher exists in development.

---

# 2. Role Model

Use these exact roles:

CITIZEN
CHW
DOCTOR
FACILITY_ADMIN
DISTRICT_OFFICER
SUPER_ADMIN

Do not use one generic ADMIN role.

---

# 3. Scope Model

Authorization has two dimensions:

1. Role
2. Scope

A user's role alone is insufficient for workforce access.

Add explicit scope fields to the user/account model.

Recommended model:

User
- id
- role
- preferredLanguage
- active

FacilityMembership
- id
- userId
- facilityId
- membershipRole
- active
- startsAt
- endsAt

CHWAssignment
- id
- userId
- catchmentCode / ward / pincode
- facilityId
- active

DistrictAssignment
- id
- userId
- districtCode
- active

This allows a doctor to belong to one or more facilities without giving them district-wide visibility.

---

# 4. Required Access Matrix

## Citizen

Can:
- View public facility catalogue
- Search facilities
- View public facility details
- View own profile
- View own appointments
- View own queue token
- View own referrals
- View own referral timeline
- View own encounters that are explicitly released to citizen access
- View own follow-ups
- Manage own consent
- Receive own notifications

Cannot:
- Search patients
- List patients
- View another patient's record
- View another patient's referral
- View another patient's appointment
- View workforce dashboards
- View district analytics
- View raw HFR private contacts
- View internal clinical notes

The citizen API must not have a generic GET /patients endpoint.

---

# 5. CHW / ASHA / ANM Access

The CHW role is not automatically global.

Default scope:
- Patients registered by the worker
- Patients explicitly assigned to the worker
- Patients in the worker's configured catchment
- Relevant facility records needed for care navigation
- Referrals created by the worker or belonging to the worker's assigned workflow

Can:
- Register patient
- Update permitted demographics
- Record vitals
- Create triage
- View relevant patient history
- Create primary-care referral
- View referral status
- Queue offline operations
- View facility capabilities

Cannot:
- Modify another facility's queue configuration
- Resolve district-wide data quality issues
- Change practitioner permissions
- View unrestricted patient population across all district facilities

For the hackathon demo, a CHW may be assigned to a single primary facility and catchment. The implementation must still support multiple assignments.

---

# 6. DOCTOR Access

Doctor access is facility-scoped.

A doctor can see:
- Patients with an active appointment at one of their assigned facilities
- Patients currently in their facility queue
- Patients linked to an encounter at their facility
- Patients referred into their facility when the referral is accepted
- Prior clinical history that is permitted by the application's clinical-access policy

A doctor cannot:
- Browse every patient in Maharashtra
- Access unrelated patients from another facility simply by knowing an ID
- View district-wide citizen data unless separately authorized

Doctor clinical access should be based on a patient relationship, not just role.

The backend should expose an access helper such as:

canDoctorAccessPatient(doctorId, patientId)

that checks:
- active facility membership
- appointment relationship
- encounter relationship
- active referral relationship

---

# 7. FACILITY_ADMIN Access

Facility Admin sees all operational and patient workflow records belonging to their assigned facility.

Can:
- View facility patients
- View facility appointments
- View queue
- Configure doctor roster
- Accept/reject incoming referrals for that facility
- View facility referrals
- Manage operational demo inventory
- View facility analytics

Cannot:
- Edit another facility's records
- View district-wide clinical records without a legitimate operational relationship
- Change district-level registry data

---

# 8. DISTRICT_OFFICER Access

District Officer can:
- View district facilities
- View district map
- View aggregated analytics
- View referral pipeline
- View facility quality scores
- Resolve HFR data quality issues
- View operational alerts

By default, district dashboards should be aggregate/de-identified.

Do not expose all individual patient medical records on the command dashboard.

For an operational drill-down route, require an explicit reason and audit the action.

---

# 9. SUPER_ADMIN

Super Admin is a development and system-operations role.

Can access everything required for testing, but every privileged read/write must still be audited.

Do not use SUPER_ADMIN as a shortcut in normal application flows.

---

# 10. Separate Frontend Application Architecture

Keep one repository but create clearly separated route groups and application shells.

Recommended structure:

frontend/
  app/
    (citizen)/
      citizen/
      find-care/
      facilities/
      appointments/
      referrals/
      records/
      followups/
      profile/

    (workforce)/
      portal/
        page.tsx
      portal/patients/
      portal/triage/
      portal/queues/
      portal/referrals/
      portal/appointments/
      portal/sync/
      portal/analytics/
      portal/quality/
      portal/admin/

    auth/
    public/

Use separate layouts:

CitizenLayout
WorkforceLayout

Do not share the same navigation component between the two shells.

---

# 11. Development Role Switcher Rules

The existing role switcher is useful for demos but is currently dangerous as a product pattern.

Replace it with:

### Development-only Demo Persona Switcher

Only display when:

NODE_ENV=development
or
DEMO_MODE=true

It must issue a real session for the selected synthetic persona.

It must not mutate the role in React state only.

When switching from:

Citizen -> Doctor

the client must obtain a new server-authenticated session/token whose user role is DOCTOR.

After switching personas:
- clear TanStack Query caches
- clear protected IndexedDB namespaces
- clear in-memory patient state
- reload application context
- load the new role's dashboard

Never retain citizen cached records after switching to another demo persona on the same device.

---

# 12. Backend Authorization Architecture

Add a centralized authorization layer.

Suggested structure:

backend/src/authz/
  roles.ts
  permissions.ts
  scopes.ts
  policy.ts
  patient.policy.ts
  referral.policy.ts
  appointment.policy.ts
  facility.policy.ts
  queue.policy.ts

Expose policy functions:

canViewPatient(actor, patient)
canEditPatient(actor, patient)
canViewEncounter(actor, encounter)
canCreateReferral(actor, patient)
canAcceptReferral(actor, referral)
canManageQueue(actor, facility)
canViewDistrictAnalytics(actor)
canResolveDataQualityIssue(actor)

Controllers must call services which enforce policies.

The policy layer must not trust request-body fields such as:

facilityId
userId
role
patientId

as proof of authorization.

---

# 13. Patient Access Algorithm

For every protected patient resource:

1. Authenticate actor.
2. Load actor role and active memberships.
3. Load target patient's minimal relationship data.
4. Evaluate role policy.
5. Evaluate facility/catchment relationship.
6. Evaluate encounter/appointment/referral relationship where required.
7. Audit privileged access.
8. Return only allowed fields.

Example:

GET /api/v1/patients/:patientId

Service:

getPatientForActor(actor, patientId)

Never:

prisma.patient.findUnique({ where: { id: patientId } })

without authorization checks.

---

# 14. Response DTO Isolation

Do not return full Prisma models directly.

Create DTOs.

CitizenPatientDTO:
- patientId
- displayName
- age
- sex
- appointments
- referral summaries
- followups
- citizen-visible timeline

DoctorPatientDTO:
- demographics needed for treatment
- encounter history permitted by policy
- triage
- referral context
- clinical notes permitted by policy

DistrictPatientSummaryDTO:
- patient aggregate / anonymized metrics only

This prevents accidental leakage as models grow.

---

# 15. Remove Dangerous Routes

Do not expose generic public routes such as:

GET /patients
GET /patients/:id
GET /encounters
GET /referrals

without an authorization-aware scope implementation.

Replace with purpose-specific routes.

Citizen:

GET /me
GET /me/appointments
GET /me/referrals
GET /me/timeline
GET /me/followups
GET /me/notifications

CHW:

GET /worker/patients
GET /worker/patients/:id
GET /worker/referrals

Doctor:

GET /doctor/worklist
GET /doctor/patients/:id
GET /doctor/referrals

Facility Admin:

GET /facility/patients
GET /facility/referrals
GET /facility/appointments
GET /facility/queue

District:

GET /district/overview
GET /district/facilities
GET /district/referrals
GET /district/quality
GET /district/map

---

# 16. Citizen API Contract

All citizen endpoints must resolve the patient from the authenticated session.

Example:

GET /api/v1/me/care-timeline

NOT:

GET /api/v1/patients/:id/timeline

For a citizen, the backend derives:

req.user.id
 -> linked patient
 -> patientId

The client does not select an arbitrary patientId.

This single architectural decision eliminates a large class of IDOR vulnerabilities.

---

# 17. Multi-PHC Queue Model

The OPD token system must be facility-scoped.

The same token number may exist at different PHCs without collision.

Use these queue dimensions:

facilityId
serviceDate
department
counter/service

Queue token identity:

(facilityId, serviceDate, department, tokenNumber)

Recommended human-readable token:

GM-042

where:

GM = General Medicine
042 = sequence for that facility + department + service date.

Examples:

Dhanukarwadi UPHC / General Medicine / 2026-09-11:
GM-001
GM-002
GM-003

Deonar Health Post / General Medicine / 2026-09-11:
GM-001
GM-002

This is correct because queues are independent per facility.

---

# 18. Queue Sequence Generation

Do not use:

SELECT MAX(tokenNumber) + 1

This is race-prone.

Use a database-backed counter or Redis atomic increment combined with a database uniqueness constraint.

Recommended design:

QueueCounter
- id
- facilityId
- serviceDate
- department
- lastIssuedNumber

Unique:

(facilityId, serviceDate, department)

Within a PostgreSQL transaction:

1. upsert QueueCounter
2. atomically increment
3. read resulting number
4. create QueueToken
5. commit

Add unique constraint:

(facilityId, serviceDate, department, tokenNumber)

If Redis is used for fast counters, PostgreSQL remains authoritative and the database uniqueness constraint remains mandatory.

---

# 19. Appointment -> Token Flow

The appointment system must generate a token when the user chooses an eligible appointment/OPD slot.

Flow:

Citizen submits appointment
        |
        v
POST /appointments
        |
        v
Validate facility
        |
Validate department
        |
Validate operating hours
        |
Validate slot capacity
        |
Allocate queue sequence
        |
Create appointment
        |
Create QueueToken
        |
Create notification
        |
Return token

Example response:

{
  "success": true,
  "data": {
    "appointmentId": "apt_x",
    "token": {
      "displayNumber": "GM-042",
      "facility": "Dhanukarwadi UPHC",
      "department": "General Medicine",
      "serviceDate": "2026-09-11",
      "estimatedWaitMinutes": 18
    }
  }
}

---

# 20. Walk-in Queue Flow

Not every patient has an appointment.

Support:

POST /facility/queues/:facilityId/tokens

For workforce use.

Request:

{
  "patientId": "pat_123",
  "department": "GENERAL_MEDICINE",
  "priority": "NORMAL",
  "source": "WALK_IN"
}

Server generates token.

The worker must never submit a chosen token number.

---

# 21. Priority Queue

Use a numeric priority internally.

Examples:

EMERGENCY = 100
HIGH = 75
PRIORITY = 50
NORMAL = 10

Queue ordering:

priority DESC
createdAt ASC

Do not let citizens set EMERGENCY priority themselves.

Only authorized workforce/CDSS workflow may set elevated priority.

---

# 22. Queue State Machine

WAITING
  -> CALLED
  -> IN_CONSULTATION
  -> COMPLETED

Additional:

WAITING -> NO_SHOW
WAITING -> CANCELLED
CALLED -> WAITING

Do not allow invalid transitions.

Every transition must create an audit event.

---

# 23. Facility Scope in Queue APIs

A DOCTOR may manage only queues of their active facilities.

FACILITY_ADMIN may manage queues of their facility.

DISTRICT_OFFICER may view queue aggregates but should not call individual patients into consultation.

CITIZEN may view only their own token and aggregate position information for the relevant facility.

---

# 24. Queue Privacy

Citizen view:

Your token: GM-042
Now serving: GM-031
Ahead of you: 11
Estimated wait: 18 min

Do not show names of other patients.

Worker view can show:

GM-042
Rajesh Patil
Priority: Normal

Only where the worker has access.

---

# 25. Citizen Appointment Screen

Create a dedicated citizen flow:

/citizen/appointments/new

Steps:

1. Select facility
2. Select department/service
3. Select date
4. Select available slot
5. Confirm patient identity
6. Confirm consent
7. Generate token
8. Show QR/appointment card

No patient database search.

The logged-in citizen is the patient.

If the system later supports dependents, implement a separate dependent authorization model rather than arbitrary patient selection.

---

# 26. Appointment Confirmation Card

Show:

MahaSwasthya Grid

Dhanukarwadi UPHC
General Medicine

11 September 2026
10:30 AM

Token
GM-042

Estimated wait
18 min

Status
CONFIRMED

Actions:
- Add to calendar
- View queue
- Cancel
- Directions

---

# 27. Citizen Referral View

Citizen sees a simplified referral timeline:

Referral Created
Accepted
Appointment Scheduled
Arrived
Consultation
Follow-up

Do not expose internal clinical notes, source-worker notes, or internal risk annotations unless explicitly marked citizen-visible.

---

# 28. Workforce Portal Landing Page

After workforce login:

CHW -> /portal
DOCTOR -> /portal
FACILITY_ADMIN -> /portal
DISTRICT_OFFICER -> /portal

But dashboard contents are role-specific.

CHW:
- My assigned patients
- Today’s screenings
- Pending sync
- Referrals
- Follow-ups

DOCTOR:
- Current queue
- Today’s appointments
- Patient worklist
- Referrals

FACILITY_ADMIN:
- Queue
- Appointments
- Referral intake
- Roster
- Facility operations

DISTRICT_OFFICER:
- District KPIs
- GIS
- Referral completion
- Data quality

---

# 29. Patient Registration Flow

CHW creates a patient through:

POST /api/v1/worker/patients

Server automatically records:

createdByUserId
createdByFacilityId
source = CHW
catchment
createdAt

Do not trust the client to choose createdByUserId.

The server obtains it from JWT/session.

If the worker is facility scoped, createdByFacilityId is derived from active membership.

---

# 30. Doctor Relationship to Patient

When a doctor opens a patient record, the service must establish at least one relationship:

- today's appointment at doctor's facility
- active queue token at doctor's facility
- current encounter
- accepted incoming referral
- recent encounter at assigned facility according to the defined clinical-history policy

Store relationship evidence in audit logs where appropriate.

---

# 31. Referral Authorization

Referral creation:

CHW -> primary workflow
DOCTOR -> secondary/tertiary workflow

Referral destination must be validated against facility records and permitted routing rules.

Referral accept/reject:

Only destination facility's doctor/facility admin can accept/reject.

Citizen cannot accept/reject a referral.

District Officer can inspect aggregated referral performance, not alter individual clinical decisions by default.

---

# 32. Facility Directory Privacy

The public facility directory should contain only public-safe data:

- name
- facility type
- address
- pincode
- coordinates
- operating hours
- public service types
- public specialties
- public verification status
- public facility phone/email if explicitly designated public

Do not expose the raw HFR contact person fields.

The source dataset contains contact person names, phone numbers and emails, so the import pipeline must continue sanitizing those fields before public delivery.

---

# 33. Database Changes

Add:

UserRole enum with all six roles.

FacilityMembership
CHWAssignment
DistrictAssignment
QueueCounter
AccessGrant (optional for explicit record-release workflows)

Add ownership / scope fields where needed:

Patient:
- registeredByUserId
- registeredAtFacilityId
- catchmentCode

Encounter:
- facilityId
- practitionerId

Appointment:
- facilityId
- patientId

Referral:
- sourceFacilityId
- destinationFacilityId

QueueToken:
- facilityId
- serviceDate
- department
- tokenSequence

---

# 34. Recommended QueueToken Model

QueueToken should contain:

id
appointmentId nullable
patientId
facilityId
serviceDate
department
tokenSequence
tokenPrefix
displayNumber
priority
status
estimatedWaitMinutes
createdAt
calledAt
consultationStartedAt
completedAt

Constraints:

UNIQUE(facilityId, serviceDate, department, tokenSequence)
UNIQUE(facilityId, serviceDate, department, displayNumber)

Indexes:

facilityId + serviceDate + department + status
patientId + serviceDate
appointmentId

---

# 35. Data Isolation Tests

Before accepting Phase 2, implement automated tests for every role.

## Citizen isolation tests

Citizen A requests Citizen B appointment -> 403 or 404.

Citizen A requests Citizen B referral -> 403 or 404.

Citizen A requests Citizen B timeline -> 403 or 404.

Citizen A requests generic patient list -> 403 / route unavailable.

Citizen A manipulates patientId in JSON -> no unauthorized access.

Citizen A manipulates patientId in URL -> no unauthorized access.

---

# 36. CHW Isolation Tests

CHW at Facility A:

- can access assigned patient
- can create assigned patient
- can view relevant facility records
- cannot modify Facility B queue
- cannot modify district data quality issue
- cannot access unrelated Facility B patient by ID

---

# 37. Doctor Isolation Tests

Doctor at Facility A:

- can access current Facility A queue
- can access appointment-linked patient
- can access accepted referral into Facility A
- cannot access unrelated Facility B patient
- cannot call Facility B queue
- cannot accept referral for Facility B

---

# 38. Facility Admin Tests

Facility Admin A:

- can view Facility A patients
- can manage Facility A queue
- can accept Facility A referrals
- cannot modify Facility B roster
- cannot manage Facility B queue

---

# 39. District Officer Tests

District Officer:

- can view district facilities
- can view district analytics
- can view quality issues
- can resolve quality issue
- cannot directly call queue token
- cannot modify clinical encounter notes
- patient-level access must require explicit audited operational reason if implemented

---

# 40. Frontend Query Cache Isolation

When authentication changes:

queryClient.clear()

Also clear role-protected IndexedDB caches.

Use cache keys containing user scope where appropriate:

['citizen', userId, 'appointments']
['doctor', userId, facilityId, 'worklist']
['facility', facilityId, 'queue', date, department]

Never use a generic key like:

['patients']

for protected records.

---

# 41. IndexedDB Isolation

Create separate logical stores:

citizenCache
workerCache
queueCache
syncOperations
facilityCatalog

On logout:
- clear protected user-scoped records
- preserve public facility catalogue
- clear sync operations only after successful acknowledgement or explicit discard

On persona switch in demo mode:
- wipe role-specific stores
- initialize target role stores

---

# 42. Offline Citizen Behavior

Citizen app may work offline for:

- cached facility catalogue
- previously cached appointment card
- own referral timeline cached securely on device
- static accessibility/language resources

Citizen must not perform offline creation of an appointment that requires server-side token allocation unless the product explicitly supports later booking semantics.

For Phase 2:

Offline appointment booking -> NOT supported.

Offline viewing of cached own data -> supported.

This prevents multiple offline devices from issuing conflicting tokens.

---

# 43. Offline Workforce Behavior

CHW may create offline:

- patient draft
- triage
- referral draft

Each mutation:

operationId
clientId
actorId
entityType
operation
payload
clientCreatedAt

Server validates actor scope again during sync.

Offline data must never bypass authorization during /sync/push.

---

# 44. Sync Security

The sync endpoint must derive actor identity from authentication.

Do not trust:

payload.createdByUserId
payload.facilityId
payload.actorRole

The server overwrites actor-derived fields from authenticated context.

If an offline operation was created while a worker belonged to Facility A and the membership is now inactive:

reject operation with AUTHORIZATION_CHANGED.

---

# 45. Multi-PHC Architecture

Treat every PHC/UPHC/health post as an independent operational facility in the backend.

Facility is a tenant-like boundary for operational workflows.

Each facility can have:

- practitioners
- queue
- appointments
- referrals
- local patients/worklist
- diagnostic services
- inventory
- hours

District-level services aggregate across facilities.

Never implement one global queue.

---

# 46. Queue Example Across Three Facilities

11 Sep 2026:

Dhanukarwadi UPHC:
GM-001 ... GM-042

Deonar Health Post:
GM-001 ... GM-017

DDU2 RCH UPHC:
GM-001 ... GM-021

These are separate queues.

A citizen's token always carries:

facilityId
serviceDate
department
sequence

Therefore:

GM-042 alone is not globally unique.

The system identifier is the composite scope.

---

# 47. Queue Estimation

Initially use deterministic demo estimation.

Estimated wait =
numberAhead × configuredAverageConsultationMinutes

Adjust for priority patients if implemented.

Store the value on QueueToken as a snapshot for the UI.

Expose:

GET /api/v1/me/queue-status

Citizen receives only:

my token
now serving token
number ahead
estimated wait
status

Do not return the entire queue.

---

# 48. Workforce Queue API

GET /api/v1/facility/queues/:facilityId?department=GENERAL_MEDICINE

Must verify actor can manage/view that facility.

Response:

{
  "facility": {...},
  "department": "GENERAL_MEDICINE",
  "serviceDate": "2026-09-11",
  "currentlyServing": {...},
  "waiting": [...],
  "metrics": {...}
}

Citizen API should never call this endpoint.

---

# 49. Token Allocation Transaction

Implement one service method:

allocateQueueToken({
  facilityId,
  serviceDate,
  department,
  patientId,
  appointmentId,
  priority
})

It must:

1. validate facility
2. validate department
3. validate actor/business workflow
4. lock/upsert counter
5. increment sequence
6. create token
7. calculate estimated wait
8. commit
9. emit QUEUE_TOKEN_CREATED event

If token creation fails, appointment creation must roll back if the token is mandatory for the workflow.

---

# 50. Appointment Capacity

Use simple demo slot capacity.

AppointmentSlot:
- facilityId
- department
- date
- startTime
- endTime
- capacity
- bookedCount

Booking checks:

bookedCount < capacity

Use transaction protection.

On successful appointment creation:

bookedCount += 1

Then allocate token.

---

# 51. Appointment Cancellation

Citizen can cancel own appointment before configured cutoff.

Server:

- verify appointment.patientId = authenticated patient
- verify appointment status
- verify cancellation policy
- update appointment
- update token to CANCELLED
- release slot capacity
- audit

Do not allow citizen to cancel another user's appointment by changing an ID.

---

# 52. Patient Identity Model

Use a stable internal UUID.

Expose a human-readable Patient Code where needed, e.g.:

MH-P-000123

Do not expose database primary keys as public identity semantics.

Citizen UI can display:

Patient ID: MH-P-000123

Backend uses UUID internally.

---

# 53. ABHA / Identity Handling

Keep any ABHA identifier as an explicitly optional field.

Do not assume it proves authorization.

The authenticated account remains the access-control anchor for the prototype.

Do not fabricate a claim that the system is connected to live ABDM unless it actually is.

---

# 54. Audit Requirements

Audit:

PATIENT_VIEW
PATIENT_CREATE
PATIENT_UPDATE
TRIAGE_CREATE
ENCOUNTER_VIEW
ENCOUNTER_CREATE
REFERRAL_CREATE
REFERRAL_ACCEPT
REFERRAL_REJECT
REFERRAL_VIEW
APPOINTMENT_CREATE
APPOINTMENT_VIEW
QUEUE_TOKEN_CREATE
QUEUE_CALL_NEXT
QUEUE_COMPLETE
SYNC_PUSH
DATA_QUALITY_UPDATE
DEMO_LOGIN
PERSONA_SWITCH

Audit should include:

actorId
role
facilityId if applicable
entityType
entityId
action
requestId
timestamp
metadata

Avoid storing unnecessary clinical payloads in logs.

---

# 55. API Response Filtering

Implement explicit serializer functions.

Examples:

serializePublicFacility()
serializeCitizenAppointment()
serializeCitizenReferral()
serializeWorkerPatient()
serializeDoctorPatient()
serializeFacilityQueue()
serializeDistrictMetric()

Never spread a Prisma object into res.json().

Bad:

res.json({ data: patient })

Correct:

res.json({ data: serializeCitizenPatient(patient) })

---

# 56. Route Organization

Recommended API tree:

/api/v1/auth
/api/v1/public
/api/v1/me
/api/v1/worker
/api/v1/doctor
/api/v1/facility
/api/v1/district
/api/v1/admin
/api/v1/sync
/api/v1/demo

This makes the access model obvious.

---

# 57. Public API

GET /api/v1/public/facilities
GET /api/v1/public/facilities/:id
GET /api/v1/public/facilities/nearby
GET /api/v1/public/facilities/search
GET /api/v1/public/facilities/:id/hours
GET /api/v1/public/facilities/:id/specialties

No patient data anywhere under /public.

---

# 58. Citizen API

GET /api/v1/me
GET /api/v1/me/appointments
POST /api/v1/me/appointments
GET /api/v1/me/appointments/:id
POST /api/v1/me/appointments/:id/cancel
GET /api/v1/me/queue-status
GET /api/v1/me/referrals
GET /api/v1/me/referrals/:id
GET /api/v1/me/referrals/:id/timeline
GET /api/v1/me/care-timeline
GET /api/v1/me/followups
GET /api/v1/me/notifications
POST /api/v1/me/consents
GET /api/v1/me/consents

All scope derives from authenticated citizen identity.

---

# 59. Worker API

GET /api/v1/worker/me
GET /api/v1/worker/patients
POST /api/v1/worker/patients
GET /api/v1/worker/patients/:id
PATCH /api/v1/worker/patients/:id
POST /api/v1/worker/triage
GET /api/v1/worker/triage/:id
POST /api/v1/worker/referrals
GET /api/v1/worker/referrals
GET /api/v1/worker/followups
GET /api/v1/worker/sync/status

---

# 60. Doctor API

GET /api/v1/doctor/worklist
GET /api/v1/doctor/patients/:id
GET /api/v1/doctor/patients/:id/timeline
POST /api/v1/doctor/encounters
POST /api/v1/doctor/referrals
GET /api/v1/doctor/referrals
POST /api/v1/doctor/referrals/:id/accept
POST /api/v1/doctor/referrals/:id/reject
POST /api/v1/doctor/queues/:facilityId/call-next
POST /api/v1/doctor/queues/:facilityId/complete

---

# 61. Facility API

GET /api/v1/facility/overview
GET /api/v1/facility/patients
GET /api/v1/facility/appointments
GET /api/v1/facility/queues/:facilityId
POST /api/v1/facility/queues/:facilityId/tokens
POST /api/v1/facility/queues/:facilityId/call-next
POST /api/v1/facility/queues/:facilityId/complete
GET /api/v1/facility/referrals
POST /api/v1/facility/referrals/:id/accept
POST /api/v1/facility/referrals/:id/reject
GET /api/v1/facility/practitioners
GET /api/v1/facility/inventory
GET /api/v1/facility/diagnostics

---

# 62. District API

GET /api/v1/district/overview
GET /api/v1/district/facilities
GET /api/v1/district/map
GET /api/v1/district/referrals
GET /api/v1/district/analytics
GET /api/v1/district/quality/issues
POST /api/v1/district/quality/issues/:id/resolve

Patient-level drill-downs must be explicitly audited.

---

# 63. Frontend App Separation

Public citizen application:

/citizen/*
/find-care
/facilities

Workforce:

/portal/*

Do not display:

Frontline Worker
Facility Portal
District Command Center

in the citizen application's primary navigation.

The workforce portal can display role-specific navigation after authentication.

---

# 64. Mobile Packaging

The Citizen App will eventually be packaged with Capacitor.

The Workforce Portal can remain a responsive PWA initially and can also be packaged with Capacitor if desired.

Do not create two completely unrelated Next.js codebases at this stage.

Create two logical app shells in one monorepo for faster hackathon iteration.

---

# 65. Citizen Mobile Navigation

Bottom navigation:

Home
Find Care
Appointments
Referrals
Profile

Large tap targets.

No desktop data tables.

Use cards, drawers, sheets and timeline views.

---

# 66. Workforce Mobile Navigation

Role-specific.

CHW:
Home
Patients
Triage
Referrals
Sync

Doctor:
Queue
Patients
Appointments
Referrals
More

Facility Admin:
Overview
Queue
Referrals
Roster
More

District Officer:
Overview
Map
Referrals
Quality
More

Desktop can use Sidebar navigation.

---

# 67. Data Model Extension Summary

Add these models:

FacilityMembership
CHWAssignment
DistrictAssignment
QueueCounter
AppointmentSlot
AccessGrant (optional)

Add fields:

Patient.registeredByUserId
Patient.registeredAtFacilityId
Patient.catchmentCode

QueueToken.serviceDate
QueueToken.department
QueueToken.tokenSequence
QueueToken.tokenPrefix
QueueToken.displayNumber

Appointment.department
Appointment.tokenId or one-to-one QueueToken relation depending on current schema

User.active

---

# 68. Demo Seed Strategy

Create explicit personas:

Citizen:
Sunita Patil

CHW:
Asha Worker — Dhanukarwadi

Doctor:
Dr. Neha Kulkarni — Dhanukarwadi UPHC

Facility Admin:
Dhanukarwadi Facility Admin

District Officer:
Mumbai Suburban DHO

Each user has a real database relationship.

Do not create a fake frontend role switch based only on local state.

---

# 69. Demo Patients

Seed at least:

Patient A:
Sunita Patil
registered by CHW at Dhanukarwadi

Patient B:
Aarav Gaikwad
registered by CHW at Dhanukarwadi

Patient C:
Meena Sharma
registered at Deonar

Patient D:
Rajesh Patil
registered at another facility

Security tests must use these patients to prove isolation.

---

# 70. Demo Queue Scenario

Dhanukarwadi UPHC
General Medicine
11 Sep 2026

GM-038 waiting
GM-039 waiting
GM-040 waiting
GM-041 waiting
GM-042 Sunita Patil

Currently serving:
GM-037

Estimated wait:
18 minutes

At another PHC:
Deonar Health Post
General Medicine

GM-001 ...

The two sequences must not interfere.

---

# 71. Citizen Appointment Demo

Login as Sunita.

1. Open /citizen.
2. Open Find Care.
3. Choose General Medicine.
4. Choose Dhanukarwadi UPHC.
5. Choose available slot.
6. Confirm appointment.
7. Backend creates token GM-042.
8. Citizen sees only Sunita's appointment and queue state.
9. Switch to doctor persona.
10. Doctor sees the patient in facility worklist.
11. Doctor calls next token.
12. Complete consultation.
13. Citizen timeline updates.

---

# 72. Security Demo Scenario

Login as Citizen A.

Attempt:

GET /api/v1/me/appointments

-> succeeds for Citizen A only.

Then manually substitute Citizen B's appointment ID.

GET /api/v1/me/appointments/<B-id>

-> denied.

Then attempt:

GET /api/v1/patients/B-id

-> route denied/not exposed to citizen.

Then attempt:

GET /api/v1/me/referrals/<B-referral>

-> denied.

This should be demonstrated in automated integration tests, not only manually.

---

# 73. Role Switch Security Demo

Switch:

Citizen -> Doctor

System performs actual demo-login request.

The citizen's cached queries disappear.

Doctor dashboard loads.

The doctor cannot see arbitrary district patients.

Switch:

Doctor -> District Officer

Doctor clinical cache disappears.

District dashboard loads.

---

# 74. Error Semantics

Use:

401 UNAUTHENTICATED
403 FORBIDDEN
404 NOT_FOUND
409 CONFLICT
422 VALIDATION_ERROR
429 RATE_LIMITED

For object-level authorization, prefer 404 where revealing resource existence would create an enumeration leak.

---

# 75. Database Security Principle

Application-level authorization is mandatory.

For Phase 2, do not pretend PostgreSQL RLS is implemented unless it is actually configured and tested.

The primary security mechanism is service/policy-level authorization backed by relational scope constraints and integration tests.

RLS can be Phase 3 hardening.

---

# 76. Prisma Transaction Requirements

Transactions are required for:

- appointment + slot count
- appointment + queue token
- referral + milestone
- queue counter + token
- sync operation + mutation result
- data quality correction + audit

---

# 77. DTO and Serialization Test

Add test ensuring citizen responses do not contain:

phone of doctor
email of doctor
private medical officer contact
internal clinical notes
other patient names
other patient IDs
other facility memberships

Use a recursive assertion for forbidden keys.

---

# 78. Public Facility Dataset

Continue generating:

frontend/lib/data/mumbai-suburban.public.json

from:

backend/data/source/mumbai-suburban.json

The public generator must strip raw contact person fields.

It may retain:

facilityId
name
facilityType
pincode
address
latitude
longitude
serviceType
specialties
operatingHours
public status
EMR/ABDM readiness where appropriate

---

# 79. Avoid False Live Data

Queue, inventory and appointment availability shown in the demo must be explicitly tagged as DEMO DATA where not connected to a live source.

The facility catalogue derived from HFR source data should have a visible source attribution.

Do not claim the current queue numbers are live government queues.

---

# 80. Backend Health and Diagnostics

Add:

GET /health
GET /ready
GET /api/v1/meta/role-capabilities

/meta/role-capabilities should return capability definitions for the current session to help the frontend build navigation.

Example:

{
  "role": "DOCTOR",
  "permissions": [
    "QUEUE_VIEW",
    "QUEUE_CALL_NEXT",
    "PATIENT_VIEW_CLINICAL",
    "REFERRAL_CREATE",
    "REFERRAL_REVIEW"
  ]
}

The frontend may use this for UX.

Authorization still happens server-side.

---

# 81. Frontend Route Guard

Route guard is an additional UX layer only.

Examples:

/citizen -> CITIZEN
/portal/triage -> CHW or DOCTOR
/portal/queue -> DOCTOR or FACILITY_ADMIN
/portal/quality -> DISTRICT_OFFICER or SUPER_ADMIN

If a role lacks permission:

redirect to role-appropriate home.

Do not display a blank page.

---

# 82. Patient Record URL Policy

Public app:

/citizen/records

No patient ID in the route.

Referral:

/citizen/referrals/[referralId]

Backend verifies referral belongs to authenticated patient.

Workforce:

/portal/patients/[patientId]

Backend verifies actor relationship.

This is acceptable because authorization is enforced server-side.

---

# 83. Query Scope Helpers

Create repository/service methods:

findCitizenAppointments(userId)
findCitizenReferrals(userId)
findCitizenTimeline(userId)
findWorkerPatients(workerId)
findDoctorWorklist(doctorId)
findFacilityPatients(facilityId)
findFacilityQueue(facilityId, date, department)
findDistrictMetrics(districtCode)

Avoid generic unrestricted repository methods in request handlers.

---

# 84. Facility Membership Resolution

At authentication time, load:

user role
active facility memberships
CHW catchment assignments
district assignment

Use this server-side context:

req.auth = {
  userId,
  role,
  facilityIds,
  catchmentCodes,
  districtCode
}

Never allow the client to submit these as authoritative access scope.

---

# 85. Queue SSE/WebSocket Authorization

Before creating a queue stream:

GET /queues/:facilityId/stream

verify:

Citizen -> must have own token at facility.
Doctor -> assigned facility.
Facility Admin -> assigned facility.
District Officer -> aggregate event stream only.

Do not broadcast patient names to all connected clients.

Citizen event payload:

{
  "type": "QUEUE_UPDATED",
  "myToken": "GM-042",
  "nowServing": "GM-037",
  "ahead": 11,
  "estimatedWaitMinutes": 18
}

Worker event payload can contain more details based on scope.

---

# 86. Notification Authorization

Citizen notifications:
- own appointment
- own referral
- own follow-up
- own queue changes

Worker notifications:
- assigned referrals
- assigned patients where appropriate

Facility admin:
- facility referrals
- facility queue alerts

District officer:
- district operational alerts

Never push a patient-specific notification to another role/user accidentally.

---

# 87. Data Leakage Review of Existing Prototype

Inspect the current implementation for these patterns:

- localStorage storing arbitrary patient IDs
- query parameters such as patientId used without authorization
- role stored only in localStorage
- frontend-only route guards
- generic API endpoints returning complete database records
- demo login returning a role without changing backend session
- global patient arrays loaded into client state
- React context containing all patients
- public JSON containing source contact details

Replace all such implementations.

---

# 88. Required Security Tests in CI

Run:

npm test
npm run lint
npm run typecheck
npm run build

Backend integration tests must start against Docker PostgreSQL/PostGIS.

Test at minimum:

- citizen isolation
- worker facility isolation
- doctor facility isolation
- facility admin isolation
- district role restrictions
- queue uniqueness
- concurrent token allocation
- appointment+token atomicity
- sync authorization

---

# 89. Concurrency Test for Tokens

Run 20 concurrent token allocation requests for:

same facility
same date
same department

Expected:

20 distinct sequential tokenSequence values.

No duplicates.

No lost increments.

Then run the same test for a second facility.

Expected:

its own sequence begins independently.

---

# 90. Database Constraints

At minimum:

Facility.externalFacilityId UNIQUE
Patient.patientCode UNIQUE
QueueCounter(facilityId, serviceDate, department) UNIQUE
QueueToken(facilityId, serviceDate, department, tokenSequence) UNIQUE
AppointmentSlot(facilityId, department, date, startTime, endTime) UNIQUE
FacilityMembership(userId, facilityId) UNIQUE for active membership semantics or an appropriate historical uniqueness strategy

---

# 91. Migration Strategy

Do not destroy existing data blindly.

Create a Prisma migration:

phase2_access_and_queue

Steps:

1. add role/scope tables
2. add queue fields
3. add membership data
4. migrate existing demo users into roles
5. assign synthetic facility memberships
6. backfill queue token fields
7. create unique indexes
8. validate constraints

Demo reset can recreate from zero.

---

# 92. Demo Reset

POST /api/v1/demo/reset

Must:

- clear operational demo tables
- preserve schema
- re-import source facilities
- regenerate demo personas
- regenerate demo patients
- generate facility memberships
- generate appointments
- generate queues
- generate referrals
- generate follow-ups
- generate notifications
- regenerate audit baseline

Do not delete migrations or schema.

---

# 93. Final Demo Flow After Phase 2

### Act 1 — Citizen

Open Citizen App.

Sunita logs in.

Find care.

Select Dhanukarwadi UPHC.

Book General Medicine.

Token GM-042 generated.

Citizen can view only Sunita's records.

### Act 2 — Worker

Switch using demo persona to CHW.

Open worker portal.

See assigned patients.

Register Aarav offline.

Triage Aarav.

Create referral.

### Act 3 — Doctor

Switch to Dr. Neha.

Doctor sees Dhanukarwadi queue.

Call GM-038.

Consultation.

Doctor can access patient-related records tied to the facility workflow.

### Act 4 — District Officer

Switch to District Officer.

Patient-level clinical records are not dumped onto the dashboard.

Show district metrics, facility map, referral funnel, quality issues.

### Act 5 — Security Proof

Attempt to open Sunita's record under an unrelated citizen.

Request denied.

Attempt to view Facility B patient from Facility A doctor.

Request denied.

### Act 6 — Multi-PHC Proof

Show:

Dhanukarwadi GM-042

Deonar GM-018

DDU2 GM-011

Explain that token sequences are facility + date + department scoped.

---

# 94. Acceptance Criteria

Phase 2 is complete only when all are true:

[ ] Citizen cannot retrieve another citizen's records.
[ ] Citizen has a dedicated application shell.
[ ] Workforce has a separate portal shell.
[ ] CHW access is scoped.
[ ] Doctor access is facility/relationship scoped.
[ ] Facility Admin access is facility scoped.
[ ] District Officer access is district scoped.
[ ] Super Admin is privileged and audited.
[ ] Generic unrestricted patient APIs have been removed or protected.
[ ] Patient responses use role-specific DTOs.
[ ] Appointment creation generates a server-side queue token.
[ ] Tokens are scoped by facility + date + department.
[ ] Concurrent token generation produces unique tokens.
[ ] Citizen sees only their own queue position.
[ ] Workforce can see only authorized queue/patient details.
[ ] Offline worker sync revalidates authorization.
[ ] Persona switching clears cached protected data.
[ ] Public facility JSON contains no private HFR contact person data.
[ ] Audit logs exist for protected patient access and state changes.
[ ] Integration tests cover all role boundaries.
[ ] Docker Compose starts the full stack.
[ ] Database migrations work from a clean volume.
[ ] Demo reset produces deterministic data.
[ ] Frontend production build succeeds.
[ ] Backend production build succeeds.
[ ] Complete citizen -> appointment -> token -> doctor workflow works.

---

# 95. Implementation Order

Do not implement frontend polish first.

Follow this sequence:

1. inspect current backend and schema
2. identify all unrestricted data access paths
3. create authorization/scope models
4. create role policies
5. refactor patient access into scoped services
6. refactor API route groups
7. create role-specific DTO serializers
8. implement queue counter and atomic token allocation
9. connect appointment creation to token allocation
10. add facility-scoped queue operations
11. implement citizen API
12. implement workforce role APIs
13. implement demo persona authentication
14. clear protected client caches on persona change/logout
15. separate citizen/workforce layouts
16. implement citizen appointment UI
17. implement workforce queue UI
18. add security tests
19. add concurrency tests
20. run full Docker QA
21. update demo script
22. only then perform visual polish

---

# 96. Agent Execution Contract

The coding agent must work autonomously.

Do not ask the project owner to choose:
- database design
- role behavior
- queue semantics
- endpoint names
- folder structure
- token format
- access scope
- testing approach

Use this document as the source of truth.

When an existing implementation conflicts with this document, modify the implementation to match this document.

When existing seed data conflicts with the role model, update the seed data.

When an existing frontend route conflicts with the citizen/workforce split, migrate it to the correct shell.

Do not preserve insecure behavior for backward compatibility.

---

# 97. Required Agent QA Process

After each major backend change:

1. run TypeScript typecheck
2. run Prisma validation
3. run migration
4. run unit tests
5. run integration tests
6. inspect API responses
7. verify authorization by role

After frontend changes:

1. run lint
2. run typecheck
3. run production build
4. launch application
5. test citizen app
6. test CHW portal
7. test doctor portal
8. test facility admin portal
9. test district portal
10. test mobile viewport

Before declaring completion:

- test with two citizens
- test two facilities
- test two doctors
- test two queues
- test concurrent token allocation
- test offline sync
- test persona switch
- test logout/login transition

---

# 98. Final Product Architecture

The final architecture must be:

                    MAHASWASTHYA GRID

         ┌────────────────────┬────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   CITIZEN APP          WORKFORCE PORTAL       PUBLIC APIs
         │                    │                    │
         │             ┌──────┼───────────┐        │
         │             ▼      ▼           ▼        │
         │            CHW   DOCTOR   FACILITY      │
         │                                      ADMIN
         │                         │               │
         │                         ▼               ▼
         │                 DISTRICT OFFICER     FACILITY
         │
         └──────────────────┬─────────────────────┘
                            │
                         Express
                            │
                   Auth + Policy Layer
                            │
                ┌───────────┼────────────┐
                ▼           ▼            ▼
            PostgreSQL    PostGIS       Redis
                │
         Facility boundaries
         Patient relationships
         Queue counters
         Referrals
         Appointments
         Audit logs

The key security boundary is:

ROLE + SCOPE + RELATIONSHIP

The key queue boundary is:

FACILITY + SERVICE DATE + DEPARTMENT

The key offline boundary is:

DEVICE + USER + AUTHORIZED MUTATION + IDEMPOTENT SYNC

The key public/private boundary is:

PUBLIC FACILITY CATALOGUE
        versus
PROTECTED PATIENT/WORKFORCE DATA

---

# 99. Non-Negotiable Principles

1. Never trust the frontend for authorization.
2. Never expose another patient's records to a citizen.
3. Never treat a patient ID as proof of access.
4. Never give a CHW global access by accident.
5. Never give a doctor district-wide patient access merely because of the DOCTOR role.
6. Never use a global queue for a multi-PHC system.
7. Never generate tokens with MAX()+1.
8. Never allow the client to choose the next token number.
9. Never sync offline mutations without rechecking current authorization.
10. Never return raw Prisma models from protected APIs.
11. Never put private HFR contact information into the public facility dataset.
12. Never present synthetic operational data as live government data.
13. Never claim live ABDM integration unless implemented and verified.
14. Always audit privileged access.
15. Always test authorization with hostile ID substitution.

---

# 100. Phase 2 Definition of Done

A judge should be able to observe two completely different experiences:

### Citizen

A simple mobile public-health app where the patient:

Finds a suitable PHC
-> books an appointment
-> receives a facility-scoped token
-> tracks their queue
-> views only their own care journey
-> receives referral/follow-up updates.

### Workforce

A separate operational platform where:

CHW registers and screens patients
-> Doctor manages a facility queue
-> Facility Admin manages facility operations
-> District Officer sees the network at district level.

The system must prove, technically rather than visually, that these roles cannot cross their authorization boundaries.

The resulting prototype should feel like a small but coherent multi-PHC public-health network rather than a single generic hospital dashboard.
