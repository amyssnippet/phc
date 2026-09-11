# SwasthyaSetu — Phase 3 Security & Access Control Report

**Audit Date:** 2026-09-11 08:50:00 IST  
**Target:** Express Backend API, Next.js Frontend Bundle, Android Native APK (`in.swasthyasetu.app`)  
**Status:** PASSED (Zero Critical Vulnerabilities, Zero Secret Leaks)  

---

## 1. Tenancy, Scope & IDOR Protection Matrix (Section 43 & 44)

| Boundary | Enforcement Point | Attack Vector Tested | Result |
|---|---|---|---|
| **Citizen Isolation** | `backend/src/routes/me.routes.ts` & `authz/ownership.guard.ts` | Tampering with `patientId` in URL or body | **BLOCKED (403/404)**: Server derives ownership exclusively from `req.auth.patientId`. Client inputs ignored. |
| **Cross-Patient Appointments** | `/api/v1/me/appointments/:id` | Requesting another patient's appointment UUID | **BLOCKED (404)**: Scoped query `where: { id, patientId: auth.patientId }`. |
| **Cross-Patient Referrals** | `/api/v1/me/referrals/:id` | Requesting another patient's referral UUID | **BLOCKED (404)**: Scoped ownership check enforced. |
| **Facility Isolation** | `backend/src/routes/facility.routes.ts` | Facility Admin A managing queues of Facility B | **BLOCKED (403)**: Express middleware `verifyFacilityScope` enforces matching `req.auth.facilityId`. |
| **Doctor Scoping** | `backend/src/routes/doctor.routes.ts` | Doctor calling next token or patient from unassigned facility | **BLOCKED (403)**: Doctor station verifies facility assignment before calling or completing tokens. |
| **District Command** | `backend/src/routes/district.routes.ts` | Case-level patient record enumeration | **BLOCKED (403)**: Default endpoints return aggregate counts and KPI metrics only. Individual PHI is never exposed. |

---

## 2. Hardcoded Secret & Credential Scan (Section 93)

A recursive scan across the entire frontend client bundle and static export was executed:

```bash
# Scan query patterns:
grep -rnE "(API_KEY|PRIVATE_KEY|JWT_SECRET|PASSWORD|SECRET_KEY)" frontend/out/ frontend/lib/
```

### Scan Findings:
- **HFR Private API Keys / Authorization:** None bundled in frontend or APK.
- **JWT Signing Secrets:** Kept exclusively in server-side `.env` (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).
- **Database Credentials:** `DATABASE_URL` strictly isolated to backend and worker Docker containers.
- **Next.js Client Environment (`NEXT_PUBLIC_*`):** Only contains non-sensitive public configuration:
  - `NEXT_PUBLIC_API_BASE_URL`: `http://localhost:4000/api/v1`
  - `NEXT_PUBLIC_APP_NAME`: `SwasthyaSetu`
  - `NEXT_PUBLIC_DEMO_MODE`: `true`

---

## 3. Bundled Data Sanitization (Section 105 & 106)

The bundled Android APK dataset (`frontend/lib/data/mumbai-suburban.public.json`) was generated via a sanitization pipeline from source HFR files:
- **Private Provider Contacts:** Stripped 100% of contact persons, personal mobile numbers, and personal email addresses.
- **Retained Public Attributes:** Facility ID, facility name, address, pincode, geocoded latitude/longitude, facility type, services, and normalized data quality flags.
- **Audit Verification:** Verified that `unzip -l artifacts/android/SwasthyaSetu-debug.apk` contains zero raw source files with private contact information.

---

## 4. Persona Switcher Guard (Section 45 & 118)

- The persona switcher in the header is explicitly restricted to development/demo mode (`DEMO_MODE="true"`).
- Switching persona issues a real demo JWT with cryptographic signature matching the selected persona.
- The server independently validates role permissions and facility scopes for every HTTP request.
- Client-side manipulation of localStorage or UI state cannot escalate privileges without a valid server-signed JWT.
