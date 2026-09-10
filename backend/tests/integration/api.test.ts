import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

let citizenToken: string;
let citizenPatientId: string;
let testFacilityId: string;
let frontlineToken: string;

beforeAll(async () => {
  // Ensure DB connected
  const fac = await prisma.facility.findFirst({
    where: { name: { contains: 'Dhanukarwadi' } },
  });
  if (fac) testFacilityId = fac.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('MahaSwasthya Grid Backend Integration Tests', () => {
  // 1. Health Checks
  it('GET /health returns 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it('GET /ready returns 200 with PostGIS database ready', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe('up');
    expect(res.body.data.postgis).toBe('up');
  });

  // 2. Auth Flow (Section 21)
  it('POST /api/v1/auth/verify-otp authenticates demo citizen and returns JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: '9000000001',
        otp: '123456',
        role: 'CITIZEN',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    citizenToken = res.body.data.accessToken;
    citizenPatientId = res.body.data.user.patientId;
    expect(citizenPatientId).toBeDefined();
  });

  it('POST /api/v1/auth/verify-otp authenticates demo frontline worker', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: '9000000002',
        otp: '123456',
        role: 'FRONTLINE_WORKER',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    frontlineToken = res.body.data.accessToken;
  });

  // 3. Facilities & PostGIS Geospatial Search (Section 11 & 108)
  it('GET /api/v1/facilities/nearby returns facilities sorted by PostGIS distance', async () => {
    const res = await request(app)
      .get('/api/v1/facilities/nearby')
      .query({
        lat: 19.207,
        lng: 72.838,
        radius: 15,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    const first = res.body.data.items[0];
    expect(first.distanceKm).toBeDefined();
    expect(first.distanceKm).toBeLessThanOrEqual(5);
  });

  // 4. Data Privacy Verification (Section 167)
  it('public facility endpoints NEVER expose raw private contact details', async () => {
    const res = await request(app).get('/api/v1/facilities');
    expect(res.status).toBe(200);
    const item = res.body.data.items[0];

    expect(item).not.toHaveProperty('facContactPerName');
    expect(item).not.toHaveProperty('facContactPerMobNo');
    expect(item).not.toHaveProperty('facContactPerEmail');
    expect(item).not.toHaveProperty('facAltContactPerMobNo');
  });

  // 5. Care Routing Engine (Section 12)
  it('POST /api/v1/care-routing/recommend returns explainable ranked facility recommendations', async () => {
    const res = await request(app)
      .post('/api/v1/care-routing/recommend')
      .send({
        patientId: citizenPatientId,
        symptoms: ['fever', 'cough'],
        urgency: 'MEDIUM',
        requiredService: 'PRIMARY_ASSESSMENT',
        location: {
          latitude: 19.207,
          longitude: 72.838,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommendations.length).toBeGreaterThan(0);
    const topRec = res.body.data.recommendations[0];
    expect(topRec.score).toBeGreaterThan(50);
    expect(topRec.reasons.length).toBeGreaterThan(0);
    expect(topRec.matchedCriteria).toContain('DISTANCE');
    expect(res.body.data.disclaimer).toContain('Not a medical diagnosis');
  });

  // 6. Appointment & Queue Booking (Section 15 & 16)
  it('POST /api/v1/appointments creates appointment and queue token atomically', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        patientId: citizenPatientId,
        facilityId: testFacilityId,
        appointmentDate: tomorrow.toISOString(),
        startTime: '10:00',
        endTime: '10:15',
        department: 'OPD',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenNumber).toBeDefined();
    expect(res.body.data.queueToken).toBeDefined();
    expect(res.body.data.queueToken.status).toBe('WAITING');
  });

  // 7. Triage Capture (Section 13)
  it('POST /api/v1/triage captures vitals and evaluates risk flags with safety disclaimer', async () => {
    const res = await request(app)
      .post('/api/v1/triage')
      .set('Authorization', `Bearer ${frontlineToken}`)
      .send({
        patientId: citizenPatientId,
        symptoms: ['high fever', 'chills'],
        vitals: {
          temperatureC: 39.2,
          heartRate: 110,
          respiratoryRate: 20,
          oxygenSaturation: 97,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.urgency).toBe('HIGH');
    expect(res.body.data.riskFlags).toContain('ELEVATED_TEMPERATURE');
    expect(res.body.data.disclaimer).toContain('Decision support only');
  });

  // 8. Referral Lifecycle Workflow (Section 14 & 30)
  it('Referral End-to-End: create -> accept -> book appointment -> complete', async () => {
    const destFac = await prisma.facility.findFirst({
      where: { name: { contains: 'Shirodkar' } },
    });

    // 8.1 Create referral
    const createRes = await request(app)
      .post('/api/v1/referrals')
      .set('Authorization', `Bearer ${frontlineToken}`)
      .send({
        patientId: citizenPatientId,
        sourceFacilityId: testFacilityId,
        destinationFacilityId: destFac!.id,
        reason: 'Specialist maternity assessment required',
        urgency: 'HIGH',
      });

    expect(createRes.status).toBe(201);
    const referralId = createRes.body.data.id;
    expect(referralId).toBeDefined();

    // 8.2 Accept referral
    const acceptRes = await request(app)
      .post(`/api/v1/referrals/${referralId}/accept`)
      .set('Authorization', `Bearer ${frontlineToken}`)
      .send({});
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('ACCEPTED');

    // 8.3 Book referral appointment
    const appRes = await request(app)
      .post(`/api/v1/referrals/${referralId}/appointment`)
      .set('Authorization', `Bearer ${frontlineToken}`)
      .send({
        appointmentDate: new Date().toISOString(),
        startTime: '11:00',
        endTime: '11:30',
      });
    expect(appRes.status).toBe(200);
    expect(appRes.body.data.referral.status).toBe('APPOINTMENT_BOOKED');

    // 8.4 Mark arrived
    const arriveRes = await request(app)
      .post(`/api/v1/referrals/${referralId}/arrive`)
      .set('Authorization', `Bearer ${frontlineToken}`)
      .send({});
    expect(arriveRes.status).toBe(200);
    expect(arriveRes.body.data.status).toBe('PATIENT_ARRIVED');

    // 8.5 Mark consulted
    const consultRes = await request(app)
      .post(`/api/v1/referrals/${referralId}/consult`)
      .set('Authorization', `Bearer ${frontlineToken}`)
      .send({});
    expect(consultRes.status).toBe(200);
    expect(consultRes.body.data.status).toBe('CONSULTED');

    // 8.6 Complete referral
    const completeRes = await request(app)
      .post(`/api/v1/referrals/${referralId}/complete`)
      .set('Authorization', `Bearer ${frontlineToken}`)
      .send({});
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');
  });

  // 9. Sync Push & Idempotency Test (Section 38 & 165)
  it('POST /sync/push processes operations and is strictly idempotent', async () => {
    const opId = `op_test_${Date.now()}`;
    const payload = {
      deviceId: 'test_tablet_01',
      operations: [
        {
          operationId: opId,
          entityType: 'PATIENT',
          entityId: null,
          operation: 'CREATE',
          payload: {
            firstName: 'OfflineSync',
            lastName: 'Patient',
            pincode: '400067',
          },
          clientCreatedAt: new Date().toISOString(),
        },
      ],
    };

    // First push
    const res1 = await request(app)
      .post('/api/v1/sync/push')
      .send(payload);
    expect(res1.status).toBe(200);
    expect(res1.body.data.accepted.length).toBe(1);
    expect(res1.body.data.accepted[0].status).toBe('SYNCED');

    // Duplicate push with identical operationId
    const res2 = await request(app)
      .post('/api/v1/sync/push')
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.data.accepted.length).toBe(1);
    expect(res2.body.data.accepted[0].message).toContain('Idempotent duplicate');
  });

  // 10. Data Quality Engine Assertion (Section 18.4 & 83)
  it('Data Quality Engine accurately detected both invalid time strings (17:93 and 17:73) from source JSON', async () => {
    const res = await request(app)
      .get('/api/v1/data-quality/issues')
      .query({ type: 'INVALID_TIME' });

    expect(res.status).toBe(200);
    const values = res.body.data.items.map((i: any) => i.sourceValue);
    expect(values).toContain('Invalid time format - 17:93');
    expect(values).toContain('Invalid time format - 17:73');
  });
});
