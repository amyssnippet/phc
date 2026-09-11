import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

describe('Phase 2 Multi-Role Security & Isolation Suite', () => {
  let citizenAToken: string;
  let citizenAPatientId: string;

  let citizenBToken: string;
  let citizenBPatientId: string;

  let chwToken: string;
  let doctorDhanukarwadiToken: string;
  let doctorDdu2Token: string;
  let facilityAdminDhanukarwadiToken: string;
  let districtOfficerToken: string;

  let dhanukarwadiFacilityId: string;
  let ddu2FacilityId: string;

  beforeAll(async () => {
    // 1. Fetch facilities
    const dhanukarwadi = await prisma.facility.findFirst({
      where: { name: { contains: 'Dhanukarwadi' } },
    });
    dhanukarwadiFacilityId = dhanukarwadi!.id;

    const ddu2 = await prisma.facility.findFirst({
      where: { name: { contains: 'DDU2' } },
    });
    ddu2FacilityId = ddu2!.id;

    // 2. Authenticate all personas via demo-login
    const loginPersona = async (personaKey: string) => {
      const res = await request(app)
        .post('/api/v1/auth/demo-login')
        .send({ personaKey });
      expect(res.status).toBe(200);
      return res.body.data;
    };

    const citA = await loginPersona('citizen');
    citizenAToken = citA.accessToken;
    citizenAPatientId = citA.user.patientId;

    const citB = await loginPersona('citizen_b');
    citizenBToken = citB.accessToken;
    citizenBPatientId = citB.user.patientId;

    const chw = await loginPersona('chw');
    chwToken = chw.accessToken;

    const doc1 = await loginPersona('doctor_dhanukarwadi');
    doctorDhanukarwadiToken = doc1.accessToken;

    const doc2 = await loginPersona('doctor_ddu2');
    doctorDdu2Token = doc2.accessToken;

    const admin1 = await loginPersona('facility_admin');
    facilityAdminDhanukarwadiToken = admin1.accessToken;

    const dho = await loginPersona('district_officer');
    districtOfficerToken = dho.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --------------------------------------------------------------------------
  // 1. CITIZEN ISOLATION & IDOR PREVENTION
  // --------------------------------------------------------------------------
  describe('Citizen Scope Isolation', () => {
    it('Citizen A CANNOT view Citizen B patient file (returns 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${citizenBPatientId}`)
        .set('Authorization', `Bearer ${citizenAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Citizen A CAN view own patient file', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${citizenAPatientId}`)
        .set('Authorization', `Bearer ${citizenAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(citizenAPatientId);
    });

    it('Citizen CANNOT list all patients in system (returns 403)', async () => {
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${citizenAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Citizen A /api/v1/me/appointments ONLY returns own appointments', async () => {
      const res = await request(app)
        .get('/api/v1/me/appointments')
        .set('Authorization', `Bearer ${citizenAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const appt of res.body.data.items) {
        expect(appt.patientId).toBe(citizenAPatientId);
      }
    });

    it('Citizen booking ignores malicious client-provided patientId and binds to auth user', async () => {
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 3);
      while (bookingDate.getDay() === 0) { // Dhanukarwadi is closed Sunday
        bookingDate.setDate(bookingDate.getDate() + 1);
      }

      const res = await request(app)
        .post('/api/v1/me/appointments')
        .set('Authorization', `Bearer ${citizenAToken}`)
        .send({
          patientId: citizenBPatientId, // Spoofed patientId!
          facilityId: dhanukarwadiFacilityId,
          appointmentDate: bookingDate.toISOString().slice(0, 10),
          department: 'GENERAL_MEDICINE',
          startTime: '11:00',
          endTime: '11:15',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Server must bind to citizenAPatientId, completely ignoring spoofed citizenBPatientId
      expect(res.body.data.patientId).toBe(citizenAPatientId);
      expect(res.body.data.queueToken.displayNumber).toMatch(/^GM-\d{3}$/);
    });

    it('Citizen CANNOT access workforce endpoints (403 forbidden)', async () => {
      const workerRes = await request(app)
        .get('/api/v1/worker/patients')
        .set('Authorization', `Bearer ${citizenAToken}`);
      expect(workerRes.status).toBe(403);

      const doctorRes = await request(app)
        .get('/api/v1/doctor/worklist')
        .set('Authorization', `Bearer ${citizenAToken}`);
      expect(doctorRes.status).toBe(403);

      const facilityRes = await request(app)
        .get('/api/v1/facility/overview')
        .set('Authorization', `Bearer ${citizenAToken}`);
      expect(facilityRes.status).toBe(403);

      const districtRes = await request(app)
        .get('/api/v1/district/overview')
        .set('Authorization', `Bearer ${citizenAToken}`);
      expect(districtRes.status).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // 2. CHW / FRONTLINE WORKER SCOPE ISOLATION
  // --------------------------------------------------------------------------
  describe('CHW Scope Isolation', () => {
    it('CHW can access worker patient list', async () => {
      const res = await request(app)
        .get('/api/v1/worker/patients')
        .set('Authorization', `Bearer ${chwToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('CHW CANNOT call next in OPD queue (requires clinical doctor role, returns 403)', async () => {
      const res = await request(app)
        .post(`/api/v1/doctor/queues/${dhanukarwadiFacilityId}/call-next`)
        .set('Authorization', `Bearer ${chwToken}`);

      expect(res.status).toBe(403);
    });

    it('CHW CANNOT access district administrative overview (returns 403)', async () => {
      const res = await request(app)
        .get('/api/v1/district/overview')
        .set('Authorization', `Bearer ${chwToken}`);

      expect(res.status).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // 3. DOCTOR FACILITY SCOPE ISOLATION
  // --------------------------------------------------------------------------
  describe('Doctor Multi-PHC Facility Isolation', () => {
    it('Doctor Dhanukarwadi worklist only contains tokens for Dhanukarwadi', async () => {
      const res = await request(app)
        .get('/api/v1/doctor/worklist')
        .set('Authorization', `Bearer ${doctorDhanukarwadiToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const item of res.body.data.queue) {
        expect(item.facilityId).toBe(dhanukarwadiFacilityId);
        expect(item.facilityId).not.toBe(ddu2FacilityId);
      }
    });

    it('Doctor DDU2 worklist only contains tokens for DDU2', async () => {
      const res = await request(app)
        .get('/api/v1/doctor/worklist')
        .set('Authorization', `Bearer ${doctorDdu2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const item of res.body.data.queue) {
        expect(item.facilityId).toBe(ddu2FacilityId);
        expect(item.facilityId).not.toBe(dhanukarwadiFacilityId);
      }
    });

    it('Doctor Dhanukarwadi CANNOT call queue or advance consultation at DDU2', async () => {
      const res = await request(app)
        .post(`/api/v1/doctor/queues/${ddu2FacilityId}/call-next`)
        .set('Authorization', `Bearer ${doctorDhanukarwadiToken}`)
        .send({
          department: 'GENERAL_MEDICINE',
        });

      // Doctor is not practitioner at DDU2 facility
      expect(res.status).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // 4. FACILITY ADMIN SCOPE ISOLATION
  // --------------------------------------------------------------------------
  describe('Facility Admin Scope Isolation', () => {
    it('Facility Admin Dhanukarwadi CAN manage Dhanukarwadi queue', async () => {
      const res = await request(app)
        .get('/api/v1/facility/overview')
        .set('Authorization', `Bearer ${facilityAdminDhanukarwadiToken}`)
        .query({ facilityId: dhanukarwadiFacilityId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.facility.id).toBe(dhanukarwadiFacilityId);
    });

    it('Facility Admin Dhanukarwadi CANNOT manage DDU2 facility overview (returns 403)', async () => {
      const res = await request(app)
        .get('/api/v1/facility/overview')
        .set('Authorization', `Bearer ${facilityAdminDhanukarwadiToken}`)
        .query({ facilityId: ddu2FacilityId });

      expect(res.status).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // 5. DISTRICT OFFICER AGGREGATED SCOPE
  // --------------------------------------------------------------------------
  describe('District Officer Scope', () => {
    it('District Officer CAN view district-wide multi-PHC overview', async () => {
      const res = await request(app)
        .get('/api/v1/district/overview')
        .set('Authorization', `Bearer ${districtOfficerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalFacilities).toBeGreaterThanOrEqual(2);
      expect(res.body.data.activeConsultations).toBeGreaterThanOrEqual(0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. DTO SERIALIZATION & DATA LEAKAGE PREVENTION
  // --------------------------------------------------------------------------
  describe('DTO Sanitization & Privacy Assurance', () => {
    it('Public facility listings NEVER leak private staff contact details', async () => {
      const res = await request(app).get('/api/v1/public/facilities');
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);

      for (const item of res.body.data.items) {
        expect(item).not.toHaveProperty('facContactPerName');
        expect(item).not.toHaveProperty('facContactPerMobNo');
        expect(item).not.toHaveProperty('facContactPerEmail');
        expect(item).not.toHaveProperty('facAltContactPerMobNo');
      }
    });

    it('Citizen appointment responses NEVER leak provider private contact or internal fields', async () => {
      const res = await request(app)
        .get('/api/v1/me/appointments')
        .set('Authorization', `Bearer ${citizenAToken}`);

      expect(res.status).toBe(200);
      for (const item of res.body.data.items) {
        expect(item).not.toHaveProperty('user');
        expect(item).not.toHaveProperty('passwordHash');
        expect(item.facility).toBeDefined();
        expect(item.facility).not.toHaveProperty('facContactPerMobNo');
      }
    });
  });
});
