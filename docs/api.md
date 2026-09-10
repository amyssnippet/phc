# MahaSwasthya Grid — API Reference Manual

Base URL: `http://localhost:4000/api/v1`

All responses follow standard envelope formatting:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation",
  "requestId": "req_1725000000000_abc"
}
```

---

## 1. Authentication & Session

### `POST /auth/send-otp`
Initiates mobile OTP authentication. In DEMO mode, OTP is logged and always resolves to `123456`.
- **Request Body:**
  ```json
  { "phone": "9876543210" }
  ```
- **Response:**
  ```json
  { "success": true, "data": { "phone": "9876543210", "expiresIn": 300 } }
  ```

### `POST /auth/verify-otp`
Validates OTP and issues JWT access/refresh token pair.
- **Request Body:**
  ```json
  { "phone": "9876543210", "otp": "123456" }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG...",
      "user": { "id": "...", "phone": "9876543210", "role": "CITIZEN" }
    }
  }
  ```

### `POST /auth/demo-login`
Instant role-switcher for demonstrations (bypasses SMS).
- **Request Body:**
  ```json
  { "role": "CHW", "phone": "9800000002" }
  ```

---

## 2. Facilities & Geospatial

### `GET /facilities`
List health facilities with pagination.
- **Query Params:** `q`, `pincode`, `specialty`, `page`, `limit`

### `GET /facilities/nearby`
PostGIS-accelerated radius query.
- **Query Params:**
  - `lat` (float, required): Latitude (e.g. `19.205`)
  - `lng` (float, required): Longitude (e.g. `72.852`)
  - `radius` (float, default 5): Radius in kilometers
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "fac_dhanukarwadi",
          "name": "Dhanukarwadi UPHC",
          "distanceKm": 0.42,
          "dataQualityScore": 95,
          "isOpenNow": true
        }
      ]
    }
  }
  ```

### `GET /facilities/:id`
Retrieves full facility profile, operating hours, diagnostic capabilities, and live OPD queue.

---

## 3. Care Router & Clinical Triage

### `POST /care-routing/recommend`
Executes 100-point multi-criteria ranking algorithm.
- **Request Body:**
  ```json
  {
    "patientLat": 19.205,
    "patientLng": 72.852,
    "symptoms": ["chest_pain", "shortness_of_breath"],
    "urgency": "RED",
    "department": "Cardiology"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "recommendations": [
        {
          "facility": { "id": "fac_1", "name": "Shatabdi Hospital", "facilityType": "SUB_DISTRICT_HOSPITAL" },
          "totalScore": 91.4,
          "reasons": [
            "Emergency & Critical Care tier matched for RED urgency",
            "Specialty available: Cardiology",
            "Distance: 2.1 km (PostGIS calculated)",
            "OPD queue waiting time: ~15 mins"
          ]
        }
      ]
    }
  }
  ```

### `POST /triage`
Submits syndromic triage with vital signs and records CDSS heuristic.
- **Request Body:**
  ```json
  {
    "patientId": "pat_123",
    "symptoms": ["chest_pain"],
    "vitals": {
      "temperatureC": 38.2,
      "heartRate": 115,
      "oxygenSaturation": 91,
      "bloodPressureSys": 160,
      "bloodPressureDia": 95
    }
  }
  ```

---

## 4. Live OPD Queues

### `GET /queues/:facilityId`
Returns live waiting queue, current token in consultation, and estimated wait times.

### `POST /queues/:facilityId/call-next`
Doctor calls next waiting patient into chamber.

### `POST /queues/:facilityId/complete`
Marks consultation finished and archives token.

---

## 5. Referrals (8-Step State Machine)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/referrals` | Create inter-facility referral request |
| `GET` | `/referrals/:id/timeline` | Get 8-step chronological milestone audit |
| `POST` | `/referrals/:id/accept` | Destination facility confirms bed/specialist availability |
| `POST` | `/referrals/:id/reject` | Rejection with clinical reason |
| `POST` | `/referrals/:id/appointment` | Book appointment slot |
| `POST` | `/referrals/:id/arrive` | Mark patient arrival at destination desk |
| `POST` | `/referrals/:id/consult` | Consultation began with doctor |
| `POST` | `/referrals/:id/complete` | Specialist consultation completed |

---

## 6. Offline Field Sync

### `POST /sync/push`
Idempotent batch processing of mutations staged in IndexedDB.
- **Request Body:**
  ```json
  {
    "deviceId": "dev_172500_xyz",
    "operations": [
      {
        "operationId": "op_987654",
        "entityType": "PATIENT",
        "operation": "CREATE",
        "payload": { "firstName": "Priya", "lastName": "Shinde" },
        "clientCreatedAt": "2026-09-11T00:20:00.000Z"
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "accepted": [{ "operationId": "op_987654", "serverEntityId": "pat_abc123" }],
      "conflicts": [],
      "failed": []
    }
  }
  ```

---

## 7. Demo & Data Quality

### `POST /demo/reset`
Resets system to clean state, clears synthetic noise, re-imports HFR facilities, and reseeds deterministic demo data.

### `GET /data-quality/issues`
Lists detected data quality anomalies (e.g. Saturday invalid close times `17:93` and `17:73`).
