# SwasthyaSetu — Phase 3 Final QA Test Report

**Execution Timestamp:** 2026-09-11 08:50:00 IST  
**System Version:** 1.0.0 (SIH26133)  
**District Scope:** Mumbai Suburban (50 Urban Primary Health Centres & Secondary Facilities)  
**Tested Surfaces:** Citizen Web, Citizen Android Native APK, Workforce Clinical Portal, District Command Center  

---

## 1. Automated Test Execution Summary

```text
Backend Test Suite (Vitest v3.2.7):
  ✓ tests/unit/geo.test.ts (2 tests)
  ✓ tests/unit/referral-state-machine.test.ts (3 tests)
  ✓ tests/unit/triage.test.ts (3 tests)
  ✓ tests/integration/security-isolation.test.ts (17 tests)
  ✓ tests/integration/queue-concurrency.test.ts (2 tests)
  ✓ tests/integration/api.test.ts (12 tests)

Test Files:  6 passed (6)
Tests:       39 passed (39)
Duration:    3.62s
```

---

## 2. Phase 3 Acceptance Matrix (Section 159)

| # | Test Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| 1 | Citizen accessing own appointment | 200 OK with sanitized appointment DTO | Allowed, scoped to authenticated patient | **PASS** |
| 2 | Citizen accessing other patient appointment | 403 Forbidden / 404 Not Found | Denied with FORBIDDEN_RESOURCE code | **PASS** |
| 3 | Citizen accessing own referral timeline | 200 OK with sanitized timeline events | Allowed, ownership checked against patientId | **PASS** |
| 4 | Citizen accessing other patient referral | 403 Forbidden / 404 Not Found | Denied, zero cross-patient data leaked | **PASS** |
| 5 | Facility A staff accessing Facility B patients | 403 Forbidden | Denied by facility boundary policy guard | **PASS** |
| 6 | Doctor accessing authorized clinic worklist | 200 OK with chamber & queue list | Allowed for assigned facility/specialty | **PASS** |
| 7 | Doctor accessing unrelated facility queue | 403 Forbidden | Denied by queue tenancy guard | **PASS** |
| 8 | Facility Admin A managing Facility A queue | 200 OK | Allowed to call-next and complete tokens | **PASS** |
| 9 | Facility Admin A managing Facility B queue | 403 Forbidden | Denied, cannot call next or complete | **PASS** |
| 10 | 20 concurrent walk-in token creations | Exactly GM-001 through GM-020, 0 duplicates | Atomic Redis lock + PG sequence, 0 duplicates | **PASS** |
| 11 | Multi-PHC simultaneous token creation | Facility A GM-001, Facility B GM-001 independent | Scoped by facilityId + department + date | **PASS** |
| 12 | Offline facility search & Haversine calculation | Returns nearest facilities without network | Fallback to sanitized bundled 50 PHC dataset | **PASS** |
| 13 | Offline frontline draft registration & triage | Saved in Dexie IndexedDB sync queue | Staged with PENDING_SYNC status | **PASS** |
| 14 | Offline sync replay & idempotency | Replays mutations without duplicating rows | Server verifies idempotency keys | **PASS** |
| 15 | HFR data quality rule engine (17:93 anomaly) | Normalized to UNKNOWN + flags OPEN audit issue | Preserves raw source `17:93`, logs issue | **PASS** |
| 16 | Citizen Android APK build & badging | Package `in.swasthyasetu.app`, Android 6.0 - 15 | `aapt` verified, `apksigner` verified, zipalign OK | **PASS** |
| 17 | Android static bundle & offline fallback | Contains index.html, find-care, 50 PHC catalogue | Verified via zip inspect, assets/public complete | **PASS** |

---

## 3. Visual & Responsive QA Summary (Section 157 & 158)

- **Mobile Viewports (360x800, 390x844, 430x932):**
  - No horizontal scrolling.
  - Zero clipped labels or badges.
  - `CitizenBottomNav` provides 44x44px tap targets for Home, Find Care, My Tokens, Referrals, and Health Records.
  - Persona switcher fits cleanly on mobile top bar without overflow.
  - Clean two-line compact footer replacing verbose disclaimers.
- **Workforce Experience:**
  - Mobile bottom navigation added for one-tap access to Home, Queue, Patients, Referrals, and drawer for secondary tools.
  - Dedicated Live OPD Queue Manager with dynamic selection across all 50 Mumbai Suburban PHCs.
- **District Command Center (1440x900):**
  - Full-width situational grid displaying all 50 PostGIS geocoded health facilities.
  - Interactive Leaflet OpenStreetMap visualizer with 50 live pins and facility detail cards.
  - Real-time KPI metrics: Facilities Online (50), Avg Quality (89%), Active Consultations (18), Open Quality Issues (77).
