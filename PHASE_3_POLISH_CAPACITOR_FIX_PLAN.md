# SwasthyaSetu — Phase 3: Production-Quality UI, Mobile UX, Capacitor Android App & Final QA

## 0. EXECUTION CONTRACT

You are the autonomous senior frontend engineer, mobile engineer, UX engineer, backend integration engineer, QA engineer, and build engineer for the SwasthyaSetu SIH26133 prototype.

This document is the complete implementation contract for Phase 3.

### Non-negotiable execution rules

1. DO NOT ask the user clarification questions.
2. Inspect the existing repository before changing architecture.
3. Preserve working Phase 1/2 backend contracts unless a bug or security problem requires correction.
4. Do not rewrite working business logic merely for stylistic reasons.
5. Do not fabricate healthcare statistics, government claims, patient records, inventory, bed occupancy, or live operational data.
6. Preserve the distinction between:
   - real/source HFR facility metadata,
   - derived/normalized facility metadata,
   - synthetic DEMO DATA.
7. Do not expose private HFR contact-person phone numbers/emails in the public citizen application.
8. Do not expose patient records outside the authenticated user's permitted scope.
9. Do not place HFR API keys or authorization secrets in the frontend or Capacitor bundle.
10. Never solve, bypass, defeat, weaken, or automate CAPTCHA controls.
11. Do not claim ABDM production integration if the environment is only a prototype.
12. Clinical decision support must remain assistive and non-diagnostic.
13. Every visual change must be verified in both desktop and mobile breakpoints.
14. Every major workflow must be browser-tested after implementation.
15. The final deliverable MUST include a working Android APK for the citizen application.
16. The final workspace MUST contain reproducible build instructions.
17. Prefer stable dependencies already present in the repository. Do not perform unnecessary framework migrations.
18. Do not hide errors. Fix root causes.
19. After completing implementation, run automated tests, production builds, Docker health checks, browser checks, and Android build verification.
20. If an existing feature is broken, repair it as part of this phase even if the defect was not explicitly listed below.

---

# 1. PHASE 3 OBJECTIVE

The current prototype is functionally strong enough to demonstrate the concept, but the UI still looks generated/template-like rather than deliberately designed and human-engineered.

The current screenshots show several visible problems:

- desktop navigation is overly horizontal and visually busy;
- mobile/phone layout is not a true mobile application layout;
- the top navigation can be clipped/overflow;
- text hierarchy is inconsistent;
- excessive whitespace exists in some desktop dashboard areas;
- some panels look like generic cards rather than purpose-designed clinical/operations components;
- body typography and labels look like default utility classes rather than a cohesive design system;
- the footer contains too much persistent disclaimer text and unnecessarily increases page height;
- citizen and workforce experiences still feel too closely related visually;
- the mobile workforce layout can visually collapse because desktop portal structure is being squeezed into phone width;
- buttons, badges, card borders and shadows need a stronger visual system;
- there is no finished Capacitor Android application;
- there is no final APK artifact;
- the app must behave correctly at 390px/430px phone widths without horizontal scrolling;
- the current role/persona switching mechanism must never allow a citizen to gain a workforce session or browse workforce screens without authorization.

Phase 3 transforms the prototype from a "working hackathon web app" into a polished, credible, mobile-first public health product.

---

# 2. PRODUCT POSITIONING

The product name is:

## SwasthyaSetu (स्वास्थ्यसेतु)

Sub-brand:

### Public Healthcare Access & Continuity Network

Primary use cases:

1. citizen access to public facilities,
2. appointment/token booking,
3. queue tracking,
4. frontline worker workflow,
5. doctor/facility operations,
6. inter-facility referral continuity,
7. district command monitoring,
8. data-quality monitoring,
9. offline field operation.

The citizen application and workforce portal are distinct products sharing a backend.

---

# 3. APPLICATION SURFACES

The final system has four deliberate surfaces.

## 3.1 Citizen Application

Audience:
- citizens/patients

Primary capabilities:
- find care,
- browse public facilities,
- choose service,
- book appointment/token,
- view token,
- track queue,
- track referrals,
- view own health timeline,
- view own follow-ups,
- accessibility,
- language selection,
- offline facility catalogue,
- online/offline status.

Citizen MUST NOT see:
- workforce navigation,
- other patients,
- workforce analytics,
- district GIS command center,
- internal facility administration,
- other patients' queue identities/names,
- private HFR contacts.

## 3.2 Frontline Worker Application

Audience:
- ASHA,
- ANM,
- CHW,
- authorized outreach workers.

Capabilities:
- register/lookup permitted patients,
- record vitals,
- triage,
- create primary referral,
- offline-first workflow,
- sync center,
- patient follow-up tasks.

## 3.3 Facility Application

Audience:
- doctor,
- facility admin,
- medical officer.

Capabilities differ by role:
- doctor: patient queue, consultation, clinical workflow, referrals;
- facility admin: queue management, rosters, referral acceptance, facility operations.

## 3.4 District Command Center

Audience:
- district health officer / authorized district users.

Capabilities:
- district-level aggregates,
- GIS facility view,
- referral pipeline,
- data quality,
- facility utilization,
- service access analytics.

---

# 4. UI DESIGN PRINCIPLE

The app should NOT look like a generic AI-generated dashboard.

Target visual qualities:

- human-designed,
- government/public-service credibility,
- modern healthcare,
- quiet confidence,
- highly legible,
- low cognitive load,
- excellent spacing,
- strong typography,
- semantic color usage,
- restrained motion,
- accessible,
- mobile-first.

Avoid:

- excessive gradient backgrounds,
- oversized hero cards on internal operational screens,
- tiny uppercase text everywhere,
- excessive shadows,
- random border radii,
- random icon usage,
- excessive pill-shaped UI,
- decorative animations,
- low-contrast grey text,
- default browser/select appearance,
- giant empty panels,
- text that merely repeats the page title,
- persistent verbose footer disclaimers.

---

# 5. TYPOGRAPHY SYSTEM

Create one coherent typography system.

## Recommended hierarchy

Use a professional sans-serif stack.

Preferred:
- Inter,
- Geist Sans if already installed and stable,
- otherwise system sans fallback.

Do NOT download random font files into the repository.

Base body:
- 14–16px depending on surface.

Page title:
- 28–32px desktop,
- 24px mobile.

Section title:
- 18–20px.

Card title:
- 15–17px.

Metadata:
- 12–13px.

Micro labels:
- 11–12px only where genuinely necessary.

Avoid making every label uppercase.

Uppercase is reserved for:
- statuses,
- compact operational identifiers,
- accessibility/gov labels.

Example:

GOOD:
`Current queue`

BAD:
`CURRENT QUEUE`

unless used as a tiny status eyebrow.

---

# 6. SPACING SYSTEM

Standardize around Tailwind spacing tokens.

Primary content:
- 24px desktop,
- 16px mobile.

Card padding:
- 20–24px desktop,
- 16px mobile.

Section gap:
- 24–32px.

Do not create huge 80–120px vertical gaps unless an intentional marketing section requires it.

---

# 7. BORDER/RADIUS SYSTEM

Use a deliberate radius hierarchy:

- inputs: 8px,
- buttons: 8px,
- standard cards: 12px,
- large surfaces: 16px,
- bottom sheets/drawers: 16–20px.

Do not use a different radius for every component.

Borders:
- subtle 1px neutral border.

Shadows:
- mostly one shallow elevation,
- elevated only when interactive/overlaid.

---

# 8. COLOR SYSTEM

Define semantic tokens rather than arbitrary colors.

Required semantic tokens:

- background,
- foreground,
- card,
- muted,
- border,
- primary,
- primary-foreground,
- success,
- warning,
- destructive,
- info.

Healthcare semantics:

SUCCESS:
facility operational,
accepted referral,
completed appointment,
synced data.

WARNING:
unknown data,
follow-up due,
data-quality problem.

DESTRUCTIVE:
emergency/critical workflow,
failed sync,
invalid operation.

INFO:
facility information,
queue information,
system updates.

Avoid using color as the only status signal. Pair color with:
- text,
- icon,
- shape,
- aria label.

---

# 9. GLOBAL APP HEADER

Current screenshots show too much navigation competing for space.

Replace with a responsive header system.

## Desktop

Left:
- logo/brand,
- short product subtitle.

Center/right:
- relevant surface navigation only.

Right:
- online indicator,
- language,
- account.

Do NOT display every product area to every role.

Citizen desktop navigation:
- Home
- Find Care
- My Tokens
- Referrals
- Health Timeline

Workforce:
- Overview
- Patients
- Queue
- Referrals
- Triage
- GIS/Quality depending on role

District:
- Overview
- GIS
- Facilities
- Referrals
- Quality
- Analytics

## Mobile

Do not horizontally shrink the desktop header.

Use:
- compact brand row,
- profile icon,
- language/accessibility controls in a sheet,
- bottom navigation.

---

# 10. MOBILE CITIZEN SHELL

Citizen mobile is the highest-priority mobile experience.

At 390px and 430px widths there MUST be:

- no horizontal scroll,
- no clipped labels,
- no oversized tables,
- no desktop sidebar,
- no tiny tap targets.

Bottom navigation:

1. Home
2. Find Care
3. My Tokens
4. Referrals
5. Health

Use icons + short labels.

Tap target:
minimum 44x44px.

---

# 11. MOBILE WORKFORCE SHELL

Do NOT squeeze the desktop sidebar into the phone.

Use:

- top app bar,
- contextual facility/role identity,
- bottom navigation or compact navigation rail,
- sheets for secondary actions.

Primary mobile workforce tabs:

- Home
- Queue
- Patients
- Referrals
- More

"More" opens:
- Triage
- Sync Center
- Data Quality
- GIS
- Settings.

---

# 12. REMOVE THE VERBOSE GLOBAL FOOTER

The current footer causes unnecessary height.

The current text:

"SwasthyaSetu (स्वास्थ्यसेतु) — SIH26133 Working Prototype"

"Decision support system only. Not a clinical diagnosis. Operational metrics are synthetic DEMO DATA."

"Government of Maharashtra · Health & Family Welfare Department · Mumbai Suburban District"

MUST NOT remain as a tall persistent footer on every screen.

## Replace with a compact footer

Desktop:

`SIH26133 • SwasthyaSetu • Prototype`

and a small:
`Decision support only · Demo data where indicated`

Mobile:
- one compact line or two short lines.

Clinical disclaimer MUST instead appear contextually inside:
- triage screen,
- care-routing screen,
- clinical recommendation screen.

The disclaimer should NOT consume the bottom third of a page.

---

# 13. PUBLIC/CITIZEN HOME SCREEN

The home screen should answer the user's immediate problem.

Structure:

Header.

Hero:
`How can we help you today?`

Primary action:
`Find care near me`

Secondary:
`Book a consultation token`

Then:

## My care today

- next appointment/token,
- current queue if active,
- referral status,
- follow-up due.

Then:

## Nearby public care

- 2–3 facilities,
- distance,
- specialty/service,
- open/unknown status.

Then compact:
`Offline facility information is available even without internet.`

---

# 14. FIND CARE SCREEN

Make this one of the strongest screens.

Flow:

Step 1:
`What do you need help with?`

Step 2:
service/specialty.

Step 3:
location.

Step 4:
urgency.

Then:
`Find suitable public care`

Results should be explainable.

Each result:

- facility name,
- facility type,
- distance,
- operating status,
- service/specialty,
- queue estimate if available,
- data freshness,
- "Why this facility?" expandable details,
- primary action.

Do not show private facility-contact information.

---

# 15. APPOINTMENT/TOKEN FLOW

The citizen should have a dedicated mobile booking flow.

Screen structure:

1. Select facility
2. Select department/service
3. Select date
4. Select slot
5. Review
6. Confirm
7. Token generated
8. Queue tracking

After confirmation:

## YOUR OPD TOKEN

`GM-042`

Facility:
`Dhanukarwadi UPHC`

Department:
`General Medicine`

Date:
`11 Sep 2026`

Status:
`WAITING`

Now serving:
`GM-037`

Ahead:
`5`

Estimated wait:
`18 min`

Include a QR/barcode only if the backend actually provides a stable token/reference suitable for this purpose.

---

# 16. MULTI-PHC TOKEN RULES

Tokens are scoped by:

- facility,
- service/department,
- service date.

Example:

Dhanukarwadi / General Medicine / 2026-09-11:
`GM-042`

Deonar / General Medicine / 2026-09-11:
`GM-042`

These are unrelated queues.

Patient MUST NOT see:
- names of other patients,
- phone numbers,
- medical reasons,
- clinical details.

Facility staff see only the facility queue permitted to their role.

---

# 17. QUEUE UX

Patient view:
- current token,
- own token,
- number ahead,
- estimated wait,
- status.

Doctor view:
- current,
- waiting,
- priority,
- call next,
- complete consultation.

Facility admin:
- service queues,
- queue status,
- active doctor,
- wait time,
- token counter.

Use a live update channel if already supported:
- SSE or WebSocket.

Fallback:
- short polling.

---

# 18. WORKFORCE PORTAL UI

The current workforce screen has too much empty desktop space.

Use a denser but still breathable 12-column layout.

Example desktop:

```text
┌───────────────────────────────────────────────────────┐
│ Facility context + current role                      │
├───────────────────────────────────────────────────────┤
│ Queue │ Appointments │ Referrals │ Data quality       │
├──────────────────────────┬────────────────────────────┤
│ Live Queue               │ Current Patient             │
│                          │                             │
├──────────────────────────┴────────────────────────────┤
│ Today's activity                                      │
└───────────────────────────────────────────────────────┘
```

Don't render five large cards stacked vertically if two columns can use the screen more effectively.

---

# 19. DOCTOR STATION

Doctor screen should feel like an actual work console.

Top:
- facility,
- department,
- date,
- doctor.

Main:

## Current patient

- token,
- patient pseudonym/code,
- age band,
- appointment reason,
- urgency,
- previous permitted encounter summary.

Actions:
- start consultation,
- complete,
- referral,
- follow-up.

Right column:
- waiting queue,
- priority queue,
- referral alerts.

Do not show unrelated patients.

---

# 20. FACILITY ADMIN SCREEN

Facility admin can manage only the assigned facility.

Top:
- `Dhanukarwadi UPHC`
- operational state.

Metrics:
- active tokens,
- waiting,
- completed,
- inbound referrals,
- data quality.

Actions:
- manage queue,
- manage opening hours if authorized,
- accept/reject referrals,
- manage doctors/roster if supported.

No district-wide clinical records.

---

# 21. DISTRICT COMMAND CENTER

Keep the command center visually distinct from the citizen UI.

Desktop:
- full-width map,
- KPI strip,
- referral funnel,
- facility quality ranking,
- data-quality alerts.

Do not show individual patient details by default.

Use aggregate metrics.

Case-level inspection should require an explicit authorized workflow and audit event if implemented.

---

# 22. GIS MAP IMPROVEMENTS

Current map is useful but should feel more integrated.

Features:

- marker clustering where appropriate,
- facility type filters,
- specialty filter,
- operational status,
- data-quality status,
- district/ward filter,
- list/map synchronized selection,
- selected facility detail drawer.

Mobile:
- map first,
- floating filter button,
- bottom sheet for facility list/details.

Desktop:
- map + facility list split view.

Never expose private HFR source contacts on map cards.

---

# 23. FACILITY CARD REDESIGN

Current facility cards have too many small text fragments.

Use:

```text
Dhanukarwadi UPHC
Primary Health Centre

● Operational
400067 · Kandivali West

General Medicine
OPD

Data quality
95/100

[View facility]
[Book token]
```

Use whitespace instead of more borders.

---

# 24. STATUS DESIGN

Facility status should look like:

`Operational`

not merely:
`FUNCTIONAL`

Where source semantics require:
- Operational
- Temporarily unavailable
- Unknown

Use a green dot + text.

Queue:
- Waiting,
- Called,
- In consultation,
- Completed.

Referral:
- Requested,
- Accepted,
- Dispatched,
- Arrived,
- In consultation,
- Completed,
- Rejected,
- Cancelled.

---

# 25. ACCESSIBILITY

Implement:

- keyboard navigation,
- visible focus rings,
- screen-reader labels,
- semantic buttons,
- proper headings,
- aria-live for queue updates,
- reduced-motion support,
- contrast compliant tokens,
- larger tap targets,
- descriptive icons,
- text alternatives.

Add an accessibility panel:
- text size,
- contrast,
- motion,
- language,
- voice/read-aloud if already implemented.

---

# 26. ERROR/LOADING/EMPTY STATES

Every API-backed screen must have:

1. loading state,
2. empty state,
3. error state,
4. retry state.

Examples:

`No referrals yet`

`No patients assigned`

`Queue is currently empty`

`Facility hours are unknown`

Do not substitute fake content when API data is unavailable unless the UI explicitly says `DEMO DATA`.

---

# 27. OFFLINE UX

The app must visibly distinguish:

ONLINE

OFFLINE

SYNCING

SYNCED

SYNC ERROR

## Citizen

Offline mode should still allow:
- facility catalogue,
- previously cached facility details,
- cached appointment/token information,
- cached referral timeline where permissible,
- accessibility/language controls.

Mutable operations require clear staging semantics.

## Workforce

Offline operations:
- patient registration draft,
- triage draft,
- referral draft,
- follow-up action draft.

Each staged mutation must show:

`Pending sync`

or

`Synced`.

---

# 28. CAPACITOR REQUIREMENT

A working Android app is mandatory.

Create/configure:

```text
capacitor.config.ts
android/
```

The Android app is the CITIZEN application only for this phase.

Application name:
`SwasthyaSetu`

Package ID:
choose a stable unique identifier, e.g.

`in.swasthyasetu.app`

Do not use a placeholder package if a real stable identifier can be established from the repository.

---

# 29. NEXT.JS + CAPACITOR COMPATIBILITY

Inspect the current Next.js application for server-only features.

Capacitor packages the built web application into a native shell.

Therefore ensure the citizen build can be generated as a client bundle.

If the current citizen routes depend on Next server rendering, server actions, dynamic server-only APIs, or Node-only modules:

1. refactor those specific screens to client/API-driven rendering;
2. move API access to the Express backend;
3. keep the citizen app deployable as a static web bundle;
4. configure Next.js static export where compatible.

Do not break the workforce web application merely to satisfy the citizen Android build.

The clean architecture is:

```text
Capacitor Android
      ↓
Next.js static/client bundle
      ↓
API client
      ↓
Express backend
```

The backend remains remote and is NOT bundled into Android.

---

# 30. NEXT.JS STATIC EXPORT RULE

If static export is used:

- set `output: 'export'` only if the full citizen build is compatible;
- remove unsupported server-only features from the exported surface;
- do not expose secrets in `NEXT_PUBLIC_*`;
- use runtime API base URLs through safe configuration;
- ensure local/offline data is available regardless of API availability.

If the current repository already has a working static export, preserve it.

Do not rewrite the project to a newer Next.js major version merely for Capacitor.

---

# 31. CAPACITOR PACKAGES

Use stable Capacitor packages compatible with the repository.

Required:
- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/android`

Useful native plugins where justified:
- `@capacitor/network`
- `@capacitor/preferences`
- `@capacitor/status-bar`
- `@capacitor/splash-screen`
- `@capacitor/app`

Use native plugins only where they improve the mobile application.

Do not replace IndexedDB/Dexie with Preferences for structured offline data.

---

# 32. MOBILE DATA ARCHITECTURE

The citizen APK contains:

## Bundled static data

Sanitized public facility catalogue:

```text
frontend/lib/data/mumbai-suburban.public.json
frontend/lib/data/... 
```

Potentially:
`maharashtra-demo-phcs.public.json`

ONLY public-safe fields.

## IndexedDB

Use Dexie for:

- cached facilities,
- appointments,
- own token,
- own referral summary,
- own care timeline,
- pending operations,
- sync metadata.

## Remote backend

Contains authoritative mutable server state.

Never bundle:
- database credentials,
- JWT signing secrets,
- HFR API key,
- HFR CAPTCHA authorization,
- private patient records.

---

# 33. MOBILE STARTUP FLOW

Native app launch:

```text
Splash
  ↓
Connectivity check
  ↓
Hydrate local database
  ↓
Load bundled facility fallback
  ↓
Restore session if valid
  ↓
Citizen Home
```

Do not block startup while waiting for remote APIs.

---

# 34. NETWORK DETECTION

Implement:

```text
ONLINE
OFFLINE
```

using Capacitor Network plugin where available and a browser fallback.

The status indicator should be compact:

`Online`

`Offline · Using saved data`

When reconnecting:

`Syncing…`

then:

`Synced`

---

# 35. API CLIENT

Centralize frontend API access.

Example:

```text
frontend/lib/api/
  client.ts
  auth.ts
  facilities.ts
  appointments.ts
  queues.ts
  referrals.ts
  followups.ts
```

Requirements:

- typed responses,
- standard envelope,
- request timeout,
- retry only safe idempotent requests,
- auth token handling,
- 401 handling,
- offline detection.

Do not scatter raw fetch calls across page components.

---

# 36. OFFLINE REPOSITORY PATTERN

Pages should not directly decide whether to use API or IndexedDB.

Use repositories:

```text
facilityRepository
appointmentRepository
queueRepository
referralRepository
patientRepository
```

Pattern:

```text
UI
 ↓
Repository
 ├── online → API
 └── offline → IndexedDB/bundled data
```

This is necessary for clean testability.

---

# 37. ANDROID APK BUILD

Implement:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

The final debug APK MUST exist.

Expected location:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

If a release APK is feasible without signing secrets, also produce:

```text
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

Do not require a production signing certificate for the hackathon unless one already exists.

---

# 38. APK QUALITY REQUIREMENTS

APK must:

- install on a current Android emulator/device,
- launch,
- display splash,
- open citizen home,
- navigate to find care,
- show facility catalogue,
- work offline for facility lookup,
- show offline indicator,
- connect to backend when online,
- create an appointment/token through API when online,
- display the generated token,
- display queue status,
- show referral timeline.

Test at:
- 390x844 equivalent,
- 430x932 equivalent.

---

# 39. ANDROID NATIVE UX

Configure:

- status bar,
- navigation bar,
- splash screen,
- safe areas,
- keyboard behavior,
- back button behavior.

Back button:

Citizen:
- navigate back in stack,
- double-back-to-exit only if necessary.

Bottom navigation:
- preserve tab state appropriately.

Do not allow the Android system back button to unexpectedly log out the user.

---

# 40. ANDROID CONFIGURATION

Configure:

- app label,
- package ID,
- version name,
- version code,
- orientation as portrait-first for citizen app,
- network security appropriate for local development if needed,
- production-safe HTTPS configuration where available.

Do NOT embed localhost URLs as the only API endpoint.

Provide environment configuration.

Example:
`API_BASE_URL`.

For emulator:
- use a configurable host,
- avoid hard-coded desktop localhost assumptions.

---

# 41. API BASE URL STRATEGY

Development:
- browser can use `http://localhost:4000`
- Android emulator may need host mapping such as `10.0.2.2`
- physical device needs LAN/public backend address.

Therefore do NOT hard-code:

```text
http://localhost:4000
```

inside application logic.

Implement environment-aware API URL handling.

---

# 42. PWA + CAPACITOR

The citizen web application can remain a PWA.

Capacitor is the native packaging layer.

Ensure:

- manifest name,
- icons,
- theme color,
- splash,
- offline caching strategy,
- Android wrapper.

Do not assume PWA service workers alone provide a native offline database. Dexie/IndexedDB remains authoritative for local mutable data.

---

# 43. SECURITY RE-CHECK

Before declaring Phase 3 complete:

## Citizen

Attempt:
- `/portal`
- `/facility`
- `/district`
- another patient's ID
- another referral ID
- another appointment ID
- another token

using a citizen session.

All unauthorized requests must be rejected.

## Facility admin

Attempt:
- access another facility's patients,
- another facility's queue,
- another facility's referrals.

Must be rejected.

## Doctor

Attempt:
- patient unrelated to the authorized facility/workflow.

Must be rejected.

## District officer

By default:
- aggregated data only.

Any case-level endpoint must enforce explicit permissions and audit logging.

---

# 44. DO NOT TRUST CLIENT-SIDE ROLE GUARDS

Role checks in Next.js UI are convenience only.

Actual enforcement MUST be in Express middleware/service/policy logic.

A user changing:
- URL,
- local storage,
- query parameters,
- request body,
- patient ID,
- facility ID

must not gain unauthorized access.

---

# 45. PERSONA/DEMO LOGIN RESTRICTION

The role switcher shown in the prototype is acceptable only as an explicitly marked DEMO mechanism.

Implement:

- a `DEMO MODE` label,
- obvious non-production state,
- restricted to development/demo environment,
- disabled in production build unless explicitly enabled.

Do not allow a citizen to arbitrary-switch to District Officer in a production-like build.

---

# 46. FOOTER AND BRANDING RULES

Do not repeat:

`SIH26133 Working Prototype`

on every screen as a giant footer.

Use one of:

Header micro-label:
`SIH 2026 Prototype`

or:

Settings/About:
`SwasthyaSetu · SIH26133`

The brand should look like a real product with a visible prototype indicator, not a project submission form.

---

# 47. TOP BAR CLEANUP

Current screenshots show:

`SIH 2026 PROTOTYPE | Government of Maharashtra — MedTech / HealthTech Public Service Grid`

This can remain as a small announcement strip, but reduce height.

Desktop:
- 28–32px height.

Mobile:
- 28px maximum,
- abbreviated:
  `SIH 2026 • Public Health Prototype`

Do not allow it to consume a large chunk of phone screen.

---

# 48. WORKFORCE TOP NAV CLEANUP

The current workforce portal has:

Portal / OPD Queues / Patients / Triage / Referrals / District GIS

This is too many competing links on mobile.

Desktop:
- concise role-scoped nav.

Mobile:
- menu sheet or bottom nav.

Only expose sections the active role can actually use.

---

# 49. DATA-QUALITY UI IMPROVEMENTS

Current data-quality page is strong conceptually but too list-heavy.

Convert into:

Top:
- issue count,
- severity summary,
- facility count affected.

Then tabs:

`Open`

`Resolved`

`All`

Each issue:
- severity,
- facility,
- field,
- source value,
- normalized value,
- detected at,
- resolve action.

Example:

```text
HIGH
DDU2 RCH UPHC

Saturday close time
Source: 17:93
Normalized: UNKNOWN

[Review]
```

Never silently "correct" source data.

---

# 50. CLINICAL SAFETY UI

Keep the safety language concise.

Instead of a large repeated paragraph:

`Assistive decision support only — not a diagnosis.`

Then a small `Learn more` / info control.

Full governance explanation belongs in:
- clinical screen info drawer,
- About/Methodology.

---

# 51. HEALTH RECORD UX

Citizen records page must show only the authenticated patient's own information.

Use sections:

- Care timeline
- Encounters
- Referrals
- Appointments
- Follow-ups

Don't expose internal audit logs.

Do not show raw database IDs.

Use user-facing references:
- Appointment #A1042
- Referral #R1042.

---

# 52. TOKEN UX

A generated token should have a prominent visual treatment.

Example:

```text
YOUR TOKEN

GM-042

General Medicine
Dhanukarwadi UPHC

Now serving
GM-037

5 people ahead

~18 min
```

Use a subtle highlighted container, not a giant decorative gradient.

---

# 53. APPOINTMENT CONFIRMATION

After creating a token, don't simply redirect.

Show confirmation:

```text
Appointment confirmed

Dhanukarwadi UPHC
General Medicine

11 Sep · 10:30 AM

Token
GM-042

[Track queue]
[Add to calendar]
```

Only show "Add to calendar" if the feature is implemented correctly.

---

# 54. QUEUE ESTIMATION

Queue estimation should be transparently labeled:

`Estimated wait`

not:
`Exact wait`.

If synthetic:
`Estimated wait · DEMO DATA`

Do not imply real-time clinical service guarantees.

---

# 55. DEMO DATA MARKING

Synthetic operational records should have a subtle but clear indicator.

Preferred:
- `DEMO DATA` badge near synthetic metric sections.

Do not put giant DEMO DATA banners across every page.

---

# 56. FACILITY DATA FRESHNESS

Where source metadata is available, display:

`Last registry update`

or:

`Source freshness`

If the date is unknown:
`Update date unavailable`

Do not invent a "verified today" status.

---

# 57. HFR SOURCE LANGUAGE

Public UI:
`Source: Health Facility Registry (HFR)`

Do not claim:
- live HFR feed,
- official government live availability,
- official queue,
unless the data actually comes from those systems.

Operational queue is SwasthyaSetu demo/backend data.

---

# 58. DEMO MODE

Add a compact top-level demo indicator.

Example:

`DEMO`

Clicking it opens:
- demo scenario info,
- dataset source,
- synthetic data warning.

Do NOT put all caveats into the footer.

---

# 59. DEMO RESET UX

The backend already supports demo reset.

Add only if useful to authorized workforce/demo users:

`Reset demo state`

Confirmation:
`This will reset synthetic operational data.`

Never reset real/source facility data.

---

# 60. PERFORMANCE

Target:

- fast initial citizen shell,
- lazy-load map code,
- lazy-load charts,
- avoid loading workforce-only code for citizen route,
- virtualize long facility lists if necessary,
- debounce search,
- cache GET requests.

Do not preload the entire workforce application into the citizen APK.

---

# 61. BUNDLE OPTIMIZATION

Analyze:

```bash
npm run build
```

If bundle analyzer exists, use it.

Look for:
- duplicate map libraries,
- duplicate chart libraries,
- huge icon imports,
- oversized static data,
- unused dependencies.

Import icons individually.

Do not ship the raw HFR source JSON if a sanitized compact JSON can be used.

---

# 62. MAP BUNDLE OPTIMIZATION

For mobile citizen:

- avoid loading full district GIS by default;
- only load public facility coordinates needed for the map;
- lazy-load Leaflet/MapLibre;
- preserve a list mode that works without the map.

The map must never be a single point of failure for Find Care.

---

# 63. OFFLINE FACILITY SEARCH

Implement an offline facility repository.

Input:
- pincode,
- facility type,
- specialty,
- current/simulated coordinates.

Output:
- matching facilities,
- Haversine distance,
- sorted nearest first.

If facility hours/capabilities are unknown, display `Unknown`, not `Unavailable`.

---

# 64. OFFLINE APPOINTMENT BEHAVIOR

Do not pretend a server-side appointment/token has been created while offline unless an explicit offline reservation protocol exists.

Offline:
- allow saving an appointment draft,
- show `Pending submission`.

Online:
- submit,
- receive authoritative server appointment and token.

Display:

`Draft · Awaiting connection`

rather than a fake token.

---

# 65. OFFLINE REFERRAL BEHAVIOR

Offline frontline:
- create signed/staged local referral operation,
- show `Pending sync`,
- once synced, obtain server referral ID/status.

Do not claim:
`Referral accepted`

until the server confirms it.

---

# 66. LOCAL DATA SECURITY

Avoid putting sensitive patient data into:
- localStorage,
- URLs,
- query strings,
- public route parameters where avoidable.

Use IndexedDB with:
- scoped stores,
- authenticated-session cleanup,
- logout purge of sensitive local records,
- encrypted native storage only for tokens if needed.

Use Capacitor Preferences/Secure Storage plugin if already available for refresh/session secrets; do not store JWTs unnecessarily in plain localStorage.

---

# 67. PATIENT ID ROUTES

Preferred citizen routes:

```text
/citizen/records
/citizen/referrals/[referralId]
/citizen/appointments/[appointmentId]
```

The backend must still verify ownership.

Even if the URL contains an ID, ownership is derived from the authenticated user.

---

# 68. API DTO RULES

Never return a full Prisma entity to the frontend.

Create role-specific DTOs:

```text
CitizenFacilityDTO
CitizenAppointmentDTO
CitizenReferralDTO
CitizenTimelineEventDTO

WorkerPatientDTO
DoctorPatientDTO
FacilityQueueDTO
DistrictAnalyticsDTO
```

This prevents accidental overexposure.

---

# 69. FRONTEND STATE MANAGEMENT

Do not keep patient data globally without need.

Recommended:
- TanStack Query for server data,
- Dexie for offline persistence,
- local component state for forms,
- minimal context for auth/session.

When user logs out:
- clear query cache,
- clear scoped patient cache,
- remove sensitive offline session data,
- clear demo persona if applicable.

---

# 70. AUTH SESSION RULES

Implement robust lifecycle:

- access token expiry,
- refresh where supported,
- automatic logout on refresh failure,
- query cache clearing on logout,
- route guard,
- 401 handling,
- no role-only trust on frontend.

---

# 71. ANDROID LOGOUT

Logout must:
- invalidate/clear session locally,
- clear cached sensitive patient data,
- redirect to citizen entry screen,
- prevent back-button access to authenticated screens.

---

# 72. MOBILE SCREENSHOT QA

After implementation, capture screenshots at:

## Citizen
- home
- find care
- recommendations
- booking
- token
- referrals
- record timeline
- offline mode

## Workforce
- overview
- queue
- patients
- triage
- referral

## District
- dashboard
- GIS
- data quality

Review every screenshot for:
- clipped text,
- accidental horizontal scrolling,
- tiny controls,
- inconsistent spacing,
- broken icons,
- empty giant panels,
- excessive footer,
- awkward sticky elements.

---

# 73. RESPONSIVE BREAKPOINTS

Explicitly test:

- 360x800
- 390x844
- 430x932
- 768x1024
- 1024x768
- 1280x800
- 1440x900

The 430x932 layout in particular must look like a real phone application, not desktop UI squeezed into a viewport.

---

# 74. DESKTOP QA

At 1440x900:
- command dashboard should use horizontal space,
- workforce dashboard should not be a narrow centered mobile panel,
- facility cards should form useful grids,
- map and list should be balanced,
- no giant unused vertical area.

---

# 75. NEXT.JS ROUTE ISOLATION

Ensure public citizen routes do not import workforce-only components.

The bundle should be split logically.

Do not import:
- district charts,
- heavy GIS administration,
- workforce tables

into the citizen entry screen.

---

# 76. CAPACITOR PROJECT STRUCTURE

Expected:

```text
frontend/
├── app/
├── components/
├── lib/
├── public/
├── capacitor.config.ts
├── android/
├── package.json
└── ...
```

If frontend and backend are in a monorepo, preserve existing structure and add native project at the frontend level.

---

# 77. CAPACITOR CONFIGURATION

Example conceptual configuration:

```ts
const config: CapacitorConfig = {
  appId: "in.swasthyasetu.app",
  appName: "SwasthyaSetu",
  webDir: "out",
  bundledWebRuntime: false,
};
```

Adjust to the actual Next build output.

Do not blindly copy this if the current repository uses a different web output directory.

---

# 78. ANDROID ICONS & SPLASH

Generate proper:
- launcher icon,
- adaptive icon,
- splash screen.

Do not use generic Capacitor branding.

Use SwasthyaSetu brand.

No personal photos.

---

# 79. ANDROID API CONNECTIVITY

Build a safe environment configuration:

Development:
- browser: `http://localhost:4000`
- Android emulator: `http://10.0.2.2:4000` where appropriate

Physical device:
- configurable LAN host.

Production:
- HTTPS API.

Never ship an APK whose only API URL is desktop localhost.

---

# 80. DOCKER INTEGRATION

The mobile app remains outside the Docker runtime.

Docker services:
- postgres/postgis,
- redis,
- backend,
- worker,
- frontend web.

Optional:
- reverse proxy.

Android app:
- built on host/CI,
- connects to backend URL.

The agent must verify:

```bash
docker compose up -d --build
docker compose ps
```

Then:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
curl http://localhost:3000
```

---

# 81. E2E FLOW 1 — CITIZEN APPOINTMENT/TOKEN

Automate or manually verify:

1. login as citizen,
2. open Find Care,
3. select facility,
4. select General Medicine,
5. select a date/slot,
6. submit,
7. backend creates appointment,
8. backend allocates facility-scoped token,
9. citizen sees token,
10. facility queue includes token,
11. citizen sees only own queue state.

Acceptance:

- token unique within facility+department+date,
- no other patient data returned.

---

# 82. E2E FLOW 2 — MULTI-PHC QUEUE

Create two appointments simultaneously:

Facility A:
`GM-001`

Facility B:
`GM-001`

Acceptance:
- no collision,
- each queue independent,
- each facility only sees its own queue.

---

# 83. E2E FLOW 3 — PATIENT ISOLATION

Citizen A:
- own appointment visible,
- own referral visible.

Citizen B:
- Citizen A appointment endpoint returns 403/404 according to API design,
- Citizen A referral endpoint returns 403/404,
- Citizen A timeline not accessible.

No patient enumeration.

---

# 84. E2E FLOW 4 — FACILITY ISOLATION

Facility Admin A:
- sees Facility A.

Attempt Facility B:
- rejected.

Doctor A:
- sees only permitted facility/workflow patients.

---

# 85. E2E FLOW 5 — OFFLINE FACILITY SEARCH

1. launch citizen app/web.
2. cache facility data.
3. disable network.
4. search facility by pincode.
5. display facility.
6. calculate offline approximate distance.
7. re-enable network.
8. fetch fresh data.
9. update cache.

---

# 86. E2E FLOW 6 — OFFLINE WORKFORCE

1. login as CHW.
2. disable network.
3. create patient draft.
4. record triage.
5. create referral draft.
6. verify IndexedDB queue.
7. reconnect.
8. sync.
9. verify server records.
10. verify idempotency.

---

# 87. E2E FLOW 7 — REFERRAL

1. doctor/CHW creates referral.
2. source facility timeline gets `REQUESTED`.
3. destination facility sees inbound referral.
4. destination accepts.
5. timeline updates.
6. appointment linked.
7. patient sees own timeline.
8. district analytics update.

---

# 88. E2E FLOW 8 — DATA QUALITY

1. load source data.
2. verify invalid time anomaly detected.
3. view issue.
4. mark corrected/verified.
5. ensure audit record created.
6. ensure public source value was not rewritten silently.

---

# 89. AUTOMATED TEST REQUIREMENTS

At minimum, verify:

## Backend
- authentication,
- role checks,
- policy scope,
- patient isolation,
- facility isolation,
- appointment ownership,
- token concurrency,
- referral state machine,
- offline sync idempotency,
- PostGIS nearby facilities,
- HFR parser,
- data quality rules.

## Frontend
- citizen routes,
- workforce route protection,
- logout cache clear,
- offline fallback,
- appointment flow,
- token rendering,
- responsive rendering where test tooling allows.

---

# 90. CONCURRENCY TEST

Retain or create a test with at least:

20 concurrent token creation requests for the same:

```text
facility
service
date
```

Expected:

```text
GM-001 ... GM-020
```

No duplicates.

Then concurrently request tokens at two facilities.

Expected:

Facility A:
`GM-001 ...`

Facility B:
`GM-001 ...`

---

# 91. API ERROR STANDARDIZATION

All API errors must use a consistent envelope.

Example:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN_RESOURCE",
    "message": "You are not authorized to access this resource."
  },
  "requestId": "..."
}
```

Don't leak SQL/Prisma errors.

---

# 92. LOGGING

Development logs can be verbose.

Production-like logs:
- request ID,
- method,
- route,
- status,
- latency.

Never log:
- OTP values,
- JWTs,
- API keys,
- patient full clinical records,
- HFR private contact details.

---

# 93. SECURITY CHECKLIST

Search repository for:

```text
apikey
authorization
Captcha_
NEXT_PUBLIC_
PRIVATE_KEY
JWT_SECRET
PASSWORD
TOKEN
```

Ensure secrets are not hard-coded.

Search git diff before final completion.

---

# 94. UI QUALITY CHECKLIST

For every page inspect:

### Typography
- consistent font,
- readable line lengths,
- clear hierarchy.

### Layout
- predictable spacing,
- meaningful grouping,
- no random giant gaps.

### Components
- consistent buttons,
- consistent cards,
- consistent status badges.

### Mobile
- no clipping,
- no horizontal scrolling,
- large tap targets.

### Accessibility
- focus states,
- labels,
- contrast,
- aria live updates.

---

# 95. REMOVE VIBE-CODE SYMPTOMS

Specifically search for and reduce:

- repetitive giant cards,
- overly verbose headings,
- multiple layers of "Dashboard/Portal/Overview",
- generic emojis where Lucide icons are more professional,
- arbitrary bright gradient backgrounds,
- huge all-caps status words,
- random icon + text combinations,
- default native form controls,
- duplicate descriptions,
- excessive rounded containers.

The design should suggest:
`an experienced product team made this`
rather than:
`AI generated a dashboard`.

---

# 96. ICON SYSTEM

Use Lucide or the existing icon library consistently.

Do not mix:
- emoji,
- Font Awesome,
- SVG snippets,
- arbitrary icon packs

unless there is a clear reason.

Healthcare symbols should remain understandable.

---

# 97. MOTION

Use motion sparingly.

Allowed:
- page/sheet transitions,
- success confirmation,
- queue token update,
- skeleton transitions.

Avoid:
- floating cards,
- continuous pulsing,
- large hero animations,
- distracting dashboard animations.

Respect `prefers-reduced-motion`.

---

# 98. FORMS

Use a single form system:

- React Hook Form,
- Zod,
- shadcn form components.

Errors should appear near the field.

Do not rely on browser-native validation alone.

---

# 99. SELECTORS

Current screenshots show cramped selects.

For mobile:
- use shadcn Select where options are small,
- use Command/Combobox where search is useful,
- use Sheet/Drawer for large facility lists.

Facility selection should support:
- search,
- pincode,
- nearby,
- specialty.

---

# 100. FACILITY DETAIL SCREEN

Design:

```text
Dhanukarwadi UPHC

Primary Health Centre
● Operational

400067 · Kandivali West

Services
General Medicine
OPD

Hours
Mon–Sat
09:00–16:00
```

If hours are unknown:
`Operating hours not available`

Never infer.

Then:

`Distance`

`Accessibility`

`Book token`

`View queue`

---

# 101. OFFLINE FACILITY DETAILS

If data comes from bundle/cache, display:

`Saved facility information`

not:
`Live`

unless online confirmation occurred.

---

# 102. DATA FRESHNESS UI

Use:
- `Updated recently`
only when a valid update timestamp supports it.

Otherwise:
- `Source update date unavailable`.

Do not use fake "Updated 2 min ago".

---

# 103. DISTRICT ANALYTICS UI

Use compact KPI cards:

- Facilities in registry
- Operational status records
- Referral completion
- Follow-up due
- Open data-quality issues

Do not call synthetic metrics `real-time` unless actually streaming.

Use:
`Current demo state`
or
`Operational demo metrics`.

---

# 104. COMMAND CENTER MAP

Map legend:

- Facility
- Operational
- Unknown
- Data issue

Do not imply the facility pin color means medical emergency unless that's what the data represents.

---

# 105. PUBLIC DATASET EXPORT

If the frontend bundles HFR-derived data:

Create a build-time sanitation step.

Input:
`raw HFR`

Output:
`public-safe JSON`

Strip:
- personal contact names,
- private mobile numbers,
- private email addresses,
- internal auth/technical credentials.

Keep:
- facility name,
- facility type,
- location,
- public address,
- pincode,
- service type,
- specialties,
- public status indicators.

---

# 106. HFR RAW DATA

Never ship the raw HFR source dataset inside the Android APK if it contains private contact fields.

The APK must only contain the sanitized public dataset.

---

# 107. PUBLIC DATA JSON SIZE

Minify the bundled JSON.

If large:
- split by district,
- lazy-load only the required district,
- retain a compact summary index.

Suggested:

```text
frontend/lib/data/
  districts/
    mumbai.json
    mumbai-suburban.json
    palghar.json
    thane.json
```

and optionally a small index:

```text
district-index.json
```

---

# 108. MOBILE DEFAULT DISTRICT

For SIH demonstration:
- default to Mumbai Suburban if no location is available.

Clearly label:
`Demo region: Mumbai Suburban`

This is a demo convenience, not a geolocation claim.

---

# 109. RURAL + URBAN DEMONSTRATION

Ensure the app can demonstrate:
- urban public facility access,
- rural/underserved facility access.

Do not hard-code "urban" and "rural" claims unless source geography supports them.

Use a demo region selector where useful.

---

# 110. PERSONA DEMO FLOWS

At least these demo personas:

Citizen:
- token,
- referral,
- timeline.

CHW:
- offline registration,
- triage,
- referral.

Doctor:
- call token,
- consult,
- refer.

Facility Admin:
- queue,
- inbound referrals.

District Officer:
- map,
- quality,
- analytics.

Each persona must only see its permitted navigation.

---

# 111. PATIENT HEALTH TIMELINE

Citizen sees only:
- own appointments,
- own encounters summary,
- own referrals,
- own follow-ups.

No internal audit entries.

No provider private contact details.

---

# 112. DOCTOR HISTORY VIEW

Doctor can see authorized clinical history required for the current workflow.

Keep it visually concise:
- recent encounters,
- prior referrals,
- follow-up status.

No endless scroll.

---

# 113. ASHA/CHW PATIENT VIEW

Show:
- identity,
- relevant basic information,
- vitals,
- workflow status,
- care tasks,
- referral state.

Avoid unnecessary access to unrelated historical data.

---

# 114. FACILITY ADMIN PATIENT VIEW

Admin is operational, not automatically clinical.

By default show:
- queue state,
- appointment status,
- referral workflow.

Do not expose full clinical notes simply because the user is facility admin.

---

# 115. DISTRICT OFFICER VIEW

Prefer aggregate:

`12 follow-ups overdue`

rather than:
`Patient Rahul has diabetes...`

Case-level records should be tightly controlled.

---

# 116. AUTHORIZATION POLICY LAYER

Ensure there is a reusable policy layer like:

```text
canViewPatient(user, patient)
canViewAppointment(user, appointment)
canViewReferral(user, referral)
canManageQueue(user, facility)
canViewFacilityAnalytics(user, facility)
```

Do not duplicate role checks throughout controllers.

---

# 117. OBSERVABILITY

Add API request IDs and frontend error correlation where possible.

When an appointment fails:

Frontend:
`Unable to create appointment`

Backend logs:
`requestId=req_x`

This helps debugging during the demo.

---

# 118. DEMO MODE SAFETY

Do not let the demo persona switcher bypass authorization internally.

Instead:
- demo switcher obtains a real demo JWT/session;
- backend still enforces role/scope;
- role switcher is a login convenience, not an authorization bypass.

---

# 119. QUALITY SCORE

If facility quality score is displayed:
- show methodology in tooltip/info drawer,
- label it as `Data Quality Score`,
- not an official government quality rating.

Example:

`Based on registry completeness/validation signals in this prototype.`

---

# 120. QUEUE METRICS

If wait estimates are synthetic:
`Estimated wait · DEMO DATA`.

Never call:
`Live government queue`.

---

# 121. HEALTHCARE DISCLAIMER

One compact global policy:
`Clinical decision support only. Not a diagnosis.`

Context-specific screens:
- triage,
- care routing,
- doctor support.

Keep footer compact.

---

# 122. CAPACITOR BUILD SCRIPT

Add package scripts where appropriate:

```json
{
  "scripts": {
    "build:web": "next build",
    "cap:sync": "npx cap sync android",
    "android:build": "npm run build:web && npx cap sync android && cd android && ./gradlew assembleDebug",
    "android:open": "npx cap open android"
  }
}
```

Adjust commands to the actual repository's package manager and Next configuration.

---

# 123. REPRODUCIBILITY

The repository must include:

```text
README.md

docs/
  PHASE_3_BUILD.md
```

Document:

- prerequisites,
- Docker startup,
- frontend build,
- Android build,
- emulator API configuration,
- APK path,
- demo login,
- offline testing,
- troubleshooting.

---

# 124. LOCAL DEVELOPMENT

Document:

```bash
docker compose up -d --build
```

Then:

```bash
docker compose ps
```

Then:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

Frontend:
`http://localhost:3000`

Backend:
`http://localhost:4000`

---

# 125. ANDROID DEVELOPMENT

Document:

```bash
npm install
npm run build:web
npx cap sync android
npx cap open android
```

or:

```bash
npm run android:build
```

APK:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

# 126. ANDROID EMULATOR TEST

If backend is on host machine:
- use `10.0.2.2` from Android emulator where required.

Test:
- login,
- facility list,
- booking,
- token,
- queue,
- referral.

Do not assume desktop localhost is reachable from Android emulator.

---

# 127. APK ARTIFACT

At completion, the agent MUST place/copy the verified APK in:

```text
artifacts/android/SwasthyaSetu-debug.apk
```

This path is easier to find than Gradle's nested build path.

Also retain the original Gradle artifact.

---

# 128. APK METADATA

Create:

```text
artifacts/android/BUILD_INFO.txt
```

Containing:
- app name,
- package ID,
- version,
- build type,
- build timestamp,
- git commit if available,
- backend base URL mode.

Do not include secrets.

---

# 129. SCREENSHOT ARTIFACTS

Create:

```text
artifacts/screenshots/
  citizen-home-mobile.png
  citizen-find-care-mobile.png
  citizen-token-mobile.png
  workforce-queue-desktop.png
  district-dashboard-desktop.png
  district-map-desktop.png
  data-quality-desktop.png
```

These are QA evidence, not necessarily product assets.

---

# 130. FINAL DEMO ROUTES

Verify all:

Public:
```text
/
 /find-care
 /facilities
 /facilities/[id]
```

Citizen:
```text
/citizen
/citizen/find-care
/citizen/appointments
/citizen/tokens
/citizen/referrals
/citizen/records
```

Workforce:
```text
/portal
/portal/queue
/portal/patients
/portal/triage
/portal/referrals
/portal/sync
```

District:
```text
/command
/command/map
/command/quality
/command/referrals
```

Use the actual existing route structure if already established; do not create duplicate route systems unnecessarily.

---

# 131. DO NOT BREAK EXISTING BACKEND

The agent must inspect existing backend APIs before changing frontend calls.

Existing API surfaces include:
- `/api/v1/me/*`
- `/api/v1/worker/*`
- `/api/v1/doctor/*`
- `/api/v1/facility/*`
- `/api/v1/district/*`

Preserve compatibility wherever practical.

The current API documentation uses a standard response envelope:

```json
{
  "success": true,
  "data": {},
  "message": "...",
  "requestId": "..."
}
```

Maintain that contract. 

---

# 132. QUEUE BACKEND CONTRACT

Citizen:
```text
POST /api/v1/me/appointments
GET  /api/v1/me/tokens
GET  /api/v1/me/tokens/:id
```

Facility/doctor:
```text
GET  /api/v1/facility/queues/:facilityId
POST /api/v1/facility/queues/:facilityId/call-next
POST /api/v1/facility/queues/:facilityId/complete
```

Adjust to existing route naming only after repository inspection.

---

# 133. TOKEN CREATION RESPONSE

Must return:

```json
{
  "success": true,
  "data": {
    "appointmentId": "apt_123",
    "token": "GM-042",
    "facilityId": "fac_dhanukarwadi",
    "department": "GENERAL_MEDICINE",
    "serviceDate": "2026-09-11",
    "estimatedWaitMinutes": 18,
    "queuePosition": 5
  }
}
```

The exact schema can differ but must preserve these concepts.

---

# 134. TOKEN OWNERSHIP

Every patient-facing token endpoint must verify:

```text
token.patientId == authenticatedPatient.id
```

A patient must never be able to:
- inspect another patient's token,
- cancel another patient's appointment,
- retrieve another patient's queue details.

---

# 135. QUEUE PRIVACY

Facility queue UI:
show token number.

Do not show:
- full patient name by default,
- phone,
- diagnosis,
- unrelated clinical data.

Doctor detail view can reveal authorized patient identity only when entering the consultation workflow.

---

# 136. APPOINTMENT DUPLICATE RULE

Prevent unintended duplicate appointments.

At minimum validate:
- same patient,
- same facility,
- same department,
- same service date,
- same slot,
- conflicting active appointment.

Return a meaningful error.

---

# 137. FACILITY HOURS

Appointment booking must validate normalized facility hours where available.

If hours are:
`UNKNOWN`

then:
- do not falsely reject based on missing hours;
- require a clearly defined fallback/demo policy.

The UI should show `Hours unavailable` rather than an invented schedule.

---

# 138. DATA QUALITY SOURCE LINEAGE

Facility cards should optionally expose:
`HFR source`

and:
`Last source update`.

Data-quality issues must preserve the source value.

Example:
`17:93`

must remain visible in the quality/audit interface.

---

# 139. DESIGN SYSTEM FILES

Consolidate design tokens in:

```text
frontend/app/globals.css
frontend/components/ui/
frontend/lib/design/
```

where appropriate.

Avoid duplicated hard-coded colors across page components.

---

# 140. COMPONENT REUSE

Create reusable components:

```text
AppHeader
MobileBottomNav
RoleBanner
FacilityCard
FacilityStatus
TokenCard
QueueStatus
ReferralTimeline
DataQualityBadge
OfflineIndicator
SyncStatus
MetricCard
EmptyState
ErrorState
LoadingSkeleton
```

Do not duplicate the same component markup across five pages.

---

# 141. MOBILE SHEETS/DRAWERS

Use shadcn:
- Sheet,
- Drawer,
- Dialog

for:
- filters,
- facility details,
- role menus,
- accessibility controls,
- confirmation actions.

Don't open giant desktop dialogs on phones.

---

# 142. TABLES

Large workforce tables:
- desktop DataTable,
- mobile stacked cards/list rows.

Never force a 12-column table into 390px.

---

# 143. CHARTS

Recharts:
- use only where it communicates useful information;
- responsive containers;
- avoid tiny labels;
- provide text summary underneath where appropriate.

---

# 144. MAP + LIST RESPONSIVE BEHAVIOR

Desktop:
50/50-ish split.

Tablet:
60/40.

Mobile:
map full-screen or 55–65vh,
facility list bottom sheet.

---

# 145. PATIENT APP HOME PRIORITY

Order:

1. active token,
2. upcoming appointment,
3. referral status,
4. follow-up,
5. find care.

Do not put facility administration information on citizen home.

---

# 146. WORKFORCE HOME PRIORITY

Order:

1. current queue,
2. current patient,
3. inbound referrals,
4. follow-ups,
5. data quality,
6. sync status.

---

# 147. DISTRICT HOME PRIORITY

Order:

1. access snapshot,
2. referrals,
3. facilities,
4. GIS,
5. data quality,
6. trends.

---

# 148. ROLE-SPECIFIC ACCOUNT MENUS

Citizen menu:
- Profile,
- Accessibility,
- Language,
- Privacy,
- Logout.

Worker:
- Profile,
- Facility,
- Sync status,
- Settings,
- Logout.

District:
- Profile,
- District,
- Data quality,
- Settings,
- Logout.

Do not expose irrelevant options.

---

# 149. MOBILE LANGUAGE SELECTOR

Use:
`English`
`मराठी`
`हिंदी`

Do not squeeze all three into the top bar.

Use a compact language button with a sheet on mobile.

---

# 150. SCREEN READING ORDER

Ensure DOM order matches visual order.

Important for:
- token,
- referral timeline,
- current patient,
- queue.

---

# 151. TEST WITH NO JAVASCRIPT MAP

Facility list must still work if map fails.

This is important for low-connectivity environments.

---

# 152. TEST WITH BACKEND DOWN

Citizen app should:
- open,
- show cached/bundled facilities,
- show offline state,
- not crash.

Workforce:
- show offline state,
- expose pending sync data if available.

---

# 153. TEST WITH REDUCED BANDWIDTH

Use browser throttling:
- Slow 3G,
- Offline.

Ensure:
- loading skeletons,
- no layout jumping,
- no infinite spinner.

---

# 154. CONSOLE CLEANLINESS

Final browser run should have:
- no React warnings,
- no hydration warnings,
- no unhandled promise rejections,
- no broken image errors,
- no repeated failed API loops.

---

# 155. ACCESSIBILITY SCAN

Run Lighthouse or equivalent.

Target:
- Accessibility >= 90 where practical,
- Best Practices >= 90 where practical.

Fix:
- buttons without labels,
- contrast,
- missing headings,
- invalid form labels,
- focus issues.

Do not game the score.

---

# 156. PERFORMANCE SCAN

Run Lighthouse for the citizen home.

Inspect:
- First Contentful Paint,
- Largest Contentful Paint,
- JS bundle size,
- layout shift.

Lazy-load heavy map/chart components.

---

# 157. MOBILE VISUAL QA RULE

If a page looks acceptable only at desktop width and looks cramped at 430px, the page is considered FAILED.

Do not "solve" this by adding horizontal scrolling.

---

# 158. FINAL ROLE MATRIX

Document and test:

### CITIZEN
Own:
- appointments,
- tokens,
- referrals,
- timeline,
- followups.

Public:
- facilities.

No:
- other patient data.

### CHW
Can:
- permitted patients,
- triage,
- referrals,
- offline sync.

No:
- arbitrary district-wide private medical history.

### DOCTOR
Can:
- authorized clinical patient workflow,
- queue,
- referrals,
- encounters.

No:
- unrelated facility data.

### FACILITY_ADMIN
Can:
- facility operations,
- queue,
- inbound referrals,
- rosters if implemented.

No:
- district-wide clinical records.

### DISTRICT_OFFICER
Can:
- district aggregates,
- GIS,
- data quality.

Case-level:
- only explicit authorized audited workflow.

---

# 159. FINAL TEST MATRIX

Create a test report with:

| Test | Expected | Status |
|---|---|---|
| Citizen own appointment | allowed | PASS |
| Citizen other appointment | denied | PASS |
| Citizen own referral | allowed | PASS |
| Citizen other referral | denied | PASS |
| Facility A -> Facility B records | denied | PASS |
| Doctor -> authorized patient | allowed | PASS |
| Doctor -> unrelated patient | denied | PASS |
| Facility A queue | allowed | PASS |
| Facility B queue | denied | PASS |
| 20 concurrent token requests | unique | PASS |
| Offline facility search | works | PASS |
| Offline worker draft | works | PASS |
| Sync idempotency | no duplicates | PASS |
| HFR invalid time detection | issue created | PASS |
| Citizen Android APK | installs | PASS |
| Android offline facility search | works | PASS |

---

# 160. FINAL BUILD GATE

Do NOT declare completion until ALL of these are true:

## Backend
- tests pass,
- TypeScript build passes,
- Docker stack healthy,
- database migrations succeed,
- seed succeeds,
- readiness check succeeds.

## Frontend
- production build passes,
- no critical console errors,
- responsive screens verified,
- citizen/worker role boundaries work.

## Security
- IDOR tests pass,
- role tests pass,
- facility scope tests pass,
- secret scan passes.

## Offline
- citizen facility data works offline,
- workforce offline draft works,
- sync works,
- duplicate sync is prevented.

## Android
- Capacitor sync succeeds,
- Gradle build succeeds,
- APK exists,
- APK installs,
- APK launches,
- citizen workflow works.

## UX
- footer is compact,
- mobile header no longer clips,
- workforce mobile is a genuine mobile interface,
- typography is coherent,
- cards and spacing are consistent,
- screens do not feel auto-generated,
- desktop empty space is reduced.

---

# 161. REQUIRED FINAL ARTIFACTS

The agent must produce:

```text
artifacts/
├── android/
│   ├── SwasthyaSetu-debug.apk
│   └── BUILD_INFO.txt
│
├── screenshots/
│   ├── citizen-home-mobile.png
│   ├── citizen-find-care-mobile.png
│   ├── citizen-token-mobile.png
│   ├── workforce-queue-desktop.png
│   ├── district-dashboard-desktop.png
│   ├── district-map-desktop.png
│   └── data-quality-desktop.png
│
└── qa/
    ├── phase-3-test-report.md
    ├── security-test-report.md
    └── responsive-qa.md
```

---

# 162. README FINAL SECTION

Add a concise:

## Quick Start

```bash
docker compose up -d --build
```

## Web

```text
http://localhost:3000
```

## API

```text
http://localhost:4000
```

## Android

```bash
npm run android:build
```

APK:
```text
artifacts/android/SwasthyaSetu-debug.apk
```

---

# 163. AUTONOMOUS EXECUTION ORDER

Do not execute randomly.

Follow:

## Step 1 — Audit
- inspect repo,
- inspect current screenshots/route structure if available,
- inspect existing package versions,
- inspect current Next/Capacitor configuration.

## Step 2 — Security
- verify role scope,
- verify patient isolation,
- verify facility isolation,
- verify token ownership.

## Step 3 — Design System
- typography,
- tokens,
- button/card/input consistency,
- header/footer.

## Step 4 — Citizen Mobile
- mobile shell,
- home,
- find care,
- booking,
- token,
- referrals,
- timeline.

## Step 5 — Workforce Mobile/Desktop
- role-specific shells,
- queue,
- patients,
- triage,
- referrals,
- sync.

## Step 6 — District
- command dashboard,
- GIS,
- quality.

## Step 7 — Offline
- Dexie repositories,
- bundled facility fallback,
- connectivity state,
- sync UI.

## Step 8 — Capacitor
- configuration,
- Android project,
- icons/splash,
- API base URL.

## Step 9 — QA
- unit tests,
- integration tests,
- browser flows,
- responsive tests,
- security tests,
- offline tests.

## Step 10 — Build
- Docker build,
- Next production build,
- Android APK build.

## Step 11 — Visual QA
- screenshots,
- inspect,
- fix,
- repeat.

## Step 12 — Final Verification
- clean restart,
- demo reset,
- all workflows,
- APK install test.

---

# 164. SELF-HEALING FAILURE LOOP

When an implementation step fails:

1. inspect exact error;
2. identify root cause;
3. fix;
4. rerun targeted test;
5. rerun full affected build;
6. continue.

Never merely suppress:
- TypeScript errors,
- ESLint errors,
- React warnings,
- API errors,
- Android build errors.

---

# 165. FINAL PRODUCT STANDARD

The final product should feel like:

> a credible state public-health digital service prototype that happens to be built for SIH,

not:

> a hackathon dashboard with healthcare labels.

The core narrative remains:

```text
Citizen
   ↓
Find appropriate public care
   ↓
Book facility-scoped token
   ↓
Receive care
   ↓
Referral when necessary
   ↓
Receiving facility
   ↓
Follow-up
   ↓
District visibility
```

The visual experience should reinforce that workflow rather than distract from it.

---

# 166. SUCCESS DEFINITION

Phase 3 is complete when a judge can:

1. install `SwasthyaSetu-debug.apk`;
2. open the citizen app;
3. search nearby public care;
4. see real/source-derived public facility information from the bundled sanitized dataset;
5. book a consultation/token while online;
6. receive a facility-specific token;
7. view only their own token/referral/timeline;
8. go offline;
9. still browse facility information;
10. reconnect;
11. continue the workflow;
12. observe the same system through a worker/facility/district web experience;
13. see a visibly polished responsive UI;
14. understand within minutes how the system improves healthcare access and continuity.

DO NOT STOP BEFORE THIS STANDARD IS MET.
