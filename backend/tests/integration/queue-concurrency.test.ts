import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

describe('Phase 2 Multi-PHC Atomic Queue & Concurrency Suite', () => {
  let dhanukarwadiFacilityId: string;
  let ddu2FacilityId: string;
  let facilityAdminToken: string;

  beforeAll(async () => {
    const dhanukarwadi = await prisma.facility.findFirst({
      where: { name: { contains: 'Dhanukarwadi' } },
    });
    dhanukarwadiFacilityId = dhanukarwadi!.id;

    const ddu2 = await prisma.facility.findFirst({
      where: { name: { contains: 'DDU2' } },
    });
    ddu2FacilityId = ddu2!.id;

    const adminRes = await request(app)
      .post('/api/v1/auth/demo-login')
      .send({ personaKey: 'facility_admin' });
    facilityAdminToken = adminRes.body.data.accessToken;

    // Clean up test dates so test is 100% idempotent across multiple runs
    await prisma.queueToken.deleteMany({
      where: { serviceDate: { in: ['2026-10-15', '2026-10-16'] } },
    });
    await prisma.queueCounter.deleteMany({
      where: { serviceDate: { in: ['2026-10-15', '2026-10-16'] } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('generates 20 concurrent walk-in tokens atomically without duplicates or lost updates', async () => {
    // We use a unique future date for this concurrency test so existing seed data doesn't collide
    const testDate = '2026-10-15';
    const department = 'GENERAL_MEDICINE';

    // Fire 20 parallel token allocation requests
    const promises = Array.from({ length: 20 }, (_, idx) => {
      return request(app)
        .post(`/api/v1/facility/queues/${dhanukarwadiFacilityId}/walkin`)
        .set('Authorization', `Bearer ${facilityAdminToken}`)
        .send({
          patientName: `Stress Test Patient ${idx + 1}`,
          patientPhone: `98999990${String(idx).padStart(2, '0')}`,
          department,
          serviceDate: testDate,
        });
    });

    const responses = await Promise.all(promises);

    // Verify all 20 succeeded
    for (const res of responses) {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    }

    // Extract all issued displayNumbers and sequences
    const issuedDisplayNumbers = responses.map((r) => r.body.data.token.displayNumber);
    const issuedSequences = responses.map((r) => r.body.data.token.tokenSequence);

    // 1. Check for uniqueness (no duplicates)
    const uniqueNumbers = new Set(issuedDisplayNumbers);
    expect(uniqueNumbers.size).toBe(20);

    // 2. Check that sequences are strictly 1..20
    const sortedSequences = [...issuedSequences].sort((a, b) => a - b);
    expect(sortedSequences).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));

    // 3. Verify format GM-001 through GM-020
    for (let i = 1; i <= 20; i++) {
      const expectedCode = `GM-${String(i).padStart(3, '0')}`;
      expect(issuedDisplayNumbers).toContain(expectedCode);
    }
  });

  it('independent facilities maintain isolated atomic queue counters for same date and department', async () => {
    const testDate = '2026-10-16';
    const department = 'GENERAL_MEDICINE';

    // Login DDU2 Doctor/Admin
    const ddu2Res = await request(app)
      .post('/api/v1/auth/demo-login')
      .send({ personaKey: 'doctor_ddu2' });
    const ddu2Token = ddu2Res.body.data.accessToken;

    // Issue 1 token for Dhanukarwadi
    const resA = await request(app)
      .post(`/api/v1/facility/queues/${dhanukarwadiFacilityId}/walkin`)
      .set('Authorization', `Bearer ${facilityAdminToken}`)
      .send({
        patientName: 'Facility A Walkin',
        department,
        serviceDate: testDate,
      });

    expect(resA.status).toBe(201);
    expect(resA.body.data.token.displayNumber).toBe('GM-001');

    // Issue 1 token for DDU2
    const resB = await request(app)
      .post(`/api/v1/facility/queues/${ddu2FacilityId}/walkin`)
      .set('Authorization', `Bearer ${ddu2Token}`)
      .send({
        patientName: 'Facility B Walkin',
        department,
        serviceDate: testDate,
      });

    expect(resB.status).toBe(201);
    // Facility B must start at GM-001 independently!
    expect(resB.body.data.token.displayNumber).toBe('GM-001');
  });
});
