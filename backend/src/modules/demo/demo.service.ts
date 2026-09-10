import {
  PrismaClient,
  UserRole,
  Urgency,
  AppointmentStatus,
  QueueStatus,
  ReferralStatus,
  ReferralEventType,
  FollowUpStatus,
  ResourceStatus,
} from '@prisma/client';
import { prisma } from '../../config/database.js';

export async function resetDemoState() {
  console.log('Resetting demo state...');
  await prisma.referralEvent.deleteMany({});
  await prisma.referral.deleteMany({ where: { demoData: true } });
  await prisma.queueToken.deleteMany({});
  await prisma.appointment.deleteMany({ where: { demoData: true } });
  await prisma.triageSession.deleteMany({});
  await prisma.encounter.deleteMany({ where: { demoData: true } });
  await prisma.followUp.deleteMany({ where: { demoData: true } });
  await prisma.consentRecord.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.facilityMedicineStock.deleteMany({ where: { demoData: true } });
  await prisma.diagnosticService.deleteMany({ where: { demoData: true } });
  await prisma.syncEvent.deleteMany({});
  await prisma.patient.deleteMany({ where: { demoData: true } });
  await prisma.practitioner.deleteMany({});
  await prisma.facilityDemoCapability.deleteMany({ where: { demoData: true } });

  const facilities = await prisma.facility.findMany();
  if (facilities.length === 0) {
    return { message: 'No facilities found, run import first' };
  }

  const dhanukarwadi = facilities.find((f) => f.name.includes('Dhanukarwadi')) || facilities[0];
  const shirodkar = facilities.find((f) => f.name.includes('Shirodkar')) || facilities[1];
  const ambedkar = facilities.find((f) => f.name.includes('Ambedkar')) || facilities[2];
  const deonar = facilities.find((f) => f.name.includes('Deonar')) || facilities[3];

  // 1. Users
  const usersData = [
    { name: 'Rajesh Patil', phone: '9000000001', role: UserRole.CITIZEN, lang: 'mr' },
    { name: 'Demo ASHA Worker', phone: '9000000002', role: UserRole.FRONTLINE_WORKER, lang: 'mr' },
    { name: 'Demo General Medicine Doctor', phone: '9000000003', role: UserRole.DOCTOR, lang: 'en' },
    { name: 'Demo Facility Admin', phone: '9000000004', role: UserRole.FACILITY_ADMIN, lang: 'en' },
    { name: 'Demo District Admin', phone: '9000000005', role: UserRole.DISTRICT_ADMIN, lang: 'en' },
    { name: 'Demo Super Admin', phone: '9000000006', role: UserRole.SUPER_ADMIN, lang: 'en' },
    { name: 'Meena Sharma', phone: '9000000011', role: UserRole.CITIZEN, lang: 'hi' },
    { name: 'Abdul Khan', phone: '9000000012', role: UserRole.CITIZEN, lang: 'en' },
    { name: 'Demo Obstetrics Doctor', phone: '9000000013', role: UserRole.DOCTOR, lang: 'en' },
  ];

  for (let i = 14; i <= 25; i++) {
    usersData.push({
      name: `Synthetic Health Worker ${i}`,
      phone: `90000000${i}`,
      role: i % 2 === 0 ? UserRole.FRONTLINE_WORKER : UserRole.DOCTOR,
      lang: 'mr',
    });
  }

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      update: { name: u.name, role: u.role, preferredLanguage: u.lang, demoUser: true },
      create: { name: u.name, phone: u.phone, role: u.role, preferredLanguage: u.lang, demoUser: true },
    });
    createdUsers[u.phone] = user;
  }

  // 2. Demo Capabilities
  const capabilities = [
    { facilityId: dhanukarwadi.id, specialty: 'General Medicine', service: 'PRIMARY_ASSESSMENT', queueCapacity: 50 },
    { facilityId: dhanukarwadi.id, specialty: 'Primary Care', service: 'GENERAL_OUTPATIENT', queueCapacity: 40 },
    { facilityId: shirodkar.id, specialty: 'Obstetrics & Gynaecology', service: 'MATERNAL_CARE', queueCapacity: 30 },
    { facilityId: shirodkar.id, specialty: 'Paediatrics', service: 'CHILD_ASSESSMENT', queueCapacity: 25 },
    { facilityId: ambedkar.id, specialty: 'Obstetrics & Gynaecology', service: 'SPECIALIST_REVIEW', queueCapacity: 35 },
    { facilityId: deonar.id, specialty: 'General Medicine', service: 'PRIMARY_ASSESSMENT', queueCapacity: 45 },
  ];
  for (const cap of capabilities) {
    await prisma.facilityDemoCapability.create({ data: { ...cap, demoData: true } });
  }

  // 3. Practitioners
  const doctorUsers = Object.values(createdUsers).filter((u: any) => u.role === UserRole.DOCTOR);
  const createdPractitioners = [];
  for (let i = 0; i < doctorUsers.length; i++) {
    const doc = doctorUsers[i];
    const fac = facilities[i % facilities.length];
    const p = await prisma.practitioner.create({
      data: {
        userId: doc.id,
        facilityId: fac.id,
        designation: i % 2 === 0 ? 'Medical Officer' : 'Senior Consultant',
        specialty: i % 2 === 0 ? 'General Medicine' : 'Obstetrics & Gynaecology',
        licenseNumber: `MMC-2024-${1000 + i}`,
        active: true,
      },
    });
    createdPractitioners.push(p);
  }

  // 4. Patients
  const rajesh = await prisma.patient.create({
    data: {
      userId: createdUsers['9000000001'].id,
      patientCode: 'MH-P-000101',
      firstName: 'Rajesh',
      lastName: 'Patil',
      dateOfBirth: new Date('1985-04-12'),
      sex: 'MALE',
      phone: '9000000001',
      address: 'Near Station, Kandivali West',
      pincode: '400067',
      latitude: 19.207,
      longitude: 72.838,
      abhaReference: '91-4567-8901-2345',
      emergencyName: 'Family Contact',
      emergencyPhone: '9876543210',
      demoData: true,
    },
  });
  await prisma.$executeRawUnsafe(
    `UPDATE "Patient" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE "id" = $3::uuid`,
    72.838,
    19.207,
    rajesh.id
  );

  const createdPatients = [rajesh];
  const firstNames = ['Meena', 'Abdul', 'Aarav', 'Sunita', 'Pooja', 'Vikram', 'Ramesh', 'Sanjay', 'Geeta', 'Kavita'];
  const lastNames = ['Sharma', 'Khan', 'Kadam', 'Chavan', 'More', 'Jadhav', 'Shinde', 'Gaikwad', 'Pawar', 'Sawant'];

  for (let i = 2; i <= 50; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const code = `MH-P-${String(100 + i).padStart(6, '0')}`;
    const lat = 19.05 + (i % 20) * 0.01;
    const lng = 72.82 + (i % 15) * 0.01;
    const pat = await prisma.patient.create({
      data: {
        patientCode: code,
        firstName: fn,
        lastName: ln,
        dateOfBirth: new Date(1960 + (i % 45), (i * 2) % 12, (i * 3) % 28 + 1),
        sex: i % 2 === 0 ? 'FEMALE' : 'MALE',
        phone: `98000${String(i).padStart(5, '0')}`,
        address: `Plot ${i * 4}, Mumbai Suburban`,
        pincode: i % 2 === 0 ? '400067' : '400070',
        latitude: lat,
        longitude: lng,
        demoData: true,
      },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE "Patient" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE "id" = $3::uuid`,
      lng,
      lat,
      pat.id
    );
    createdPatients.push(pat);
  }

  // 5. Encounters and Triage Sessions
  const createdEncounters = [];
  for (let i = 0; i < 50; i++) {
    const patient = createdPatients[i % createdPatients.length];
    const fac = facilities[i % facilities.length];
    const pract = createdPractitioners[i % createdPractitioners.length];

    const enc = await prisma.encounter.create({
      data: {
        patientId: patient.id,
        facilityId: fac.id,
        practitionerId: pract.id,
        type: i % 3 === 0 ? 'MATERNAL_CARE' : 'PRIMARY_CARE',
        chiefComplaint: i % 2 === 0 ? 'Persistent high fever and severe dry cough' : 'Antenatal routine check-up and mild edema',
        notes: 'DEMO DATA: Initial vital signs logged, patient assessed for referral protocol.',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - (50 - i) * 3600 * 1000),
        completedAt: new Date(Date.now() - (50 - i) * 3600 * 1000 + 900000),
        demoData: true,
      },
    });
    createdEncounters.push(enc);

    const urgency = i % 10 === 0 ? Urgency.CRITICAL : i % 4 === 0 ? Urgency.HIGH : i % 2 === 0 ? Urgency.MEDIUM : Urgency.LOW;
    await prisma.triageSession.create({
      data: {
        patientId: patient.id,
        encounterId: enc.id,
        symptoms: ['fever', 'cough', 'fatigue'],
        vitals: {
          temperatureC: 38.5 + (i % 3) * 0.4,
          heartRate: 85 + (i % 20),
          respiratoryRate: 18 + (i % 8),
          oxygenSaturation: 95 - (i % 4),
        },
        riskFlags: urgency === Urgency.HIGH || urgency === Urgency.CRITICAL ? ['ELEVATED_TEMPERATURE', 'TACHYCARDIA'] : [],
        urgency,
        recommendedAction: urgency === Urgency.HIGH ? 'PRIORITY_CLINICAL_ASSESSMENT' : 'STANDARD_CONSULTATION',
        engineVersion: '1.0',
      },
    });
  }

  // 6. Appointments and Queue Tokens
  const departments = ['GM', 'OBG', 'PED'];
  for (let i = 0; i < 100; i++) {
    const patient = createdPatients[i % createdPatients.length];
    const fac = facilities[i % facilities.length];
    const dept = departments[i % departments.length];
    const tokenNum = `${dept}-${String(i + 1).padStart(3, '0')}`;
    const dateOffset = Math.floor(i / 20) - 2;
    const appDate = new Date();
    appDate.setDate(appDate.getDate() + dateOffset);

    const status =
      dateOffset < 0
        ? AppointmentStatus.COMPLETED
        : dateOffset === 0
        ? i % 3 === 0
          ? AppointmentStatus.CALLED
          : AppointmentStatus.BOOKED
        : AppointmentStatus.BOOKED;

    const qStatus =
      status === AppointmentStatus.COMPLETED
        ? QueueStatus.COMPLETED
        : status === AppointmentStatus.CALLED
        ? QueueStatus.CALLED
        : QueueStatus.WAITING;

    const app = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        facilityId: fac.id,
        practitionerId: createdPractitioners[i % createdPractitioners.length]?.id,
        appointmentDate: appDate,
        startTime: '10:00',
        endTime: '10:15',
        tokenNumber: tokenNum,
        status,
        source: 'CITIZEN',
        demoData: true,
      },
    });

    await prisma.queueToken.create({
      data: {
        facilityId: fac.id,
        appointmentId: app.id,
        department: dept,
        tokenNumber: tokenNum,
        priority: i % 5 === 0 ? Urgency.HIGH : Urgency.LOW,
        status: qStatus,
        estimatedWaitMinutes: qStatus === QueueStatus.WAITING ? (i % 8 + 1) * 8 : null,
        calledAt: qStatus === QueueStatus.CALLED ? new Date() : null,
        completedAt: qStatus === QueueStatus.COMPLETED ? new Date() : null,
      },
    });
  }

  // 7. Referrals
  const refStatuses = [
    ReferralStatus.CREATED,
    ReferralStatus.SENT,
    ReferralStatus.ACCEPTED,
    ReferralStatus.APPOINTMENT_BOOKED,
    ReferralStatus.PATIENT_ARRIVED,
    ReferralStatus.CONSULTED,
    ReferralStatus.FOLLOWUP_CREATED,
    ReferralStatus.COMPLETED,
  ];

  for (let i = 0; i < 50; i++) {
    const patient = createdPatients[i % createdPatients.length];
    const sourceFac = facilities[i % facilities.length];
    const destFac = facilities[(i + 1) % facilities.length];
    const creator = Object.values(createdUsers)[i % Object.values(createdUsers).length];
    const status = refStatuses[i % refStatuses.length];

    const ref = await prisma.referral.create({
      data: {
        patientId: patient.id,
        encounterId: createdEncounters[i]?.id || null,
        sourceFacilityId: sourceFac.id,
        destinationFacilityId: destFac.id,
        createdById: creator.id,
        reason: i % 2 === 0 ? 'Secondary evaluation for advanced maternal ultrasound' : 'Specialist opinion on chronic pediatric gastroenteritis',
        urgency: i % 4 === 0 ? Urgency.HIGH : Urgency.MEDIUM,
        status,
        acceptedAt: status !== ReferralStatus.CREATED && status !== ReferralStatus.SENT ? new Date(Date.now() - 3600 * 1000 * 12) : null,
        completedAt: status === ReferralStatus.COMPLETED ? new Date() : null,
        demoData: true,
      },
    });

    const statusIdx = refStatuses.indexOf(status);
    for (let j = 0; j <= statusIdx; j++) {
      const evType = refStatuses[j] as unknown as ReferralEventType;
      await prisma.referralEvent.create({
        data: {
          referralId: ref.id,
          eventType: evType,
          performedBy: creator.name,
          metadata: { note: `DEMO: Referral progressed to ${evType}` },
          createdAt: new Date(Date.now() - (statusIdx - j) * 3600 * 1000 * 4),
        },
      });
    }
  }

  // 8. Follow-ups
  const followupTypes = [
    'GENERAL_REVIEW',
    'MATERNAL_FOLLOWUP',
    'CHILD_FOLLOWUP',
    'DIABETES_REVIEW',
    'HYPERTENSION_REVIEW',
    'POST_REFERRAL_REVIEW',
  ];

  for (let i = 0; i < 40; i++) {
    const patient = createdPatients[i % createdPatients.length];
    const enc = createdEncounters[i % createdEncounters.length];
    const type = followupTypes[i % followupTypes.length];
    const dueOffset = (i % 10) - 4;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueOffset);

    const status =
      dueOffset < 0
        ? i % 2 === 0
          ? FollowUpStatus.COMPLETED
          : FollowUpStatus.MISSED
        : dueOffset === 0
        ? FollowUpStatus.DUE
        : FollowUpStatus.PENDING;

    await prisma.followUp.create({
      data: {
        patientId: patient.id,
        encounterId: enc.id,
        type,
        dueDate,
        status,
        assignedTo: 'Demo ASHA Worker',
        notes: 'DEMO DATA: Routine community health follow-up check.',
        completedAt: status === FollowUpStatus.COMPLETED ? new Date() : null,
        demoData: true,
      },
    });
  }

  // 9. Notifications
  const rajeshUser = createdUsers['9000000001'];
  for (let i = 0; i < 20; i++) {
    await prisma.notification.create({
      data: {
        userId: rajeshUser.id,
        title: i % 2 === 0 ? 'Appointment Confirmed' : 'Referral Update',
        body: i % 2 === 0 ? 'Your appointment at Dhanukarwadi UPHC has been scheduled.' : 'Your specialist referral has been accepted.',
        type: i % 2 === 0 ? 'APPOINTMENT_BOOKED' : 'REFERRAL_ACCEPTED',
        data: { facilityName: 'Dhanukarwadi UPHC' },
        readAt: i > 10 ? new Date() : null,
      },
    });
  }

  // 10. Scenario
  await prisma.demoScenario.deleteMany({});
  await prisma.demoScenario.create({
    data: {
      name: 'Full Care Journey - Rajesh Patil',
      version: '1.0',
      data: {
        citizenPhone: '9000000001',
        frontlinePhone: '9000000002',
        doctorPhone: '9000000003',
        facilityAdminPhone: '9000000004',
        districtAdminPhone: '9000000005',
        sourceFacility: dhanukarwadi.name,
        destinationFacility: shirodkar.name,
      },
    },
  });

  return { success: true, message: 'Demo reset completed' };
}
