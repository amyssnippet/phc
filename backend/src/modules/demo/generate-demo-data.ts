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

const prisma = new PrismaClient();

export async function generateDemoData() {
  console.log('Starting deterministic Phase 2 Demo Data Generation for SwasthyaSetu...');

  const facilities = await prisma.facility.findMany();
  if (facilities.length === 0) {
    throw new Error('No facilities found. Please run data:import first.');
  }

  const dhanukarwadi = facilities.find((f) => f.name.includes('Dhanukarwadi')) || facilities[0];
  const ddu2 = facilities.find((f) => f.name.includes('DDU2')) || facilities[1];
  const shirodkar = facilities.find((f) => f.name.includes('Shirodkar')) || facilities[2];
  const deonar = facilities.find((f) => f.name.includes('Deonar')) || facilities[3];

  const serviceDate = '2026-09-11';

  // 1. Explicit Personas (Phase 2 Section 68)
  const personas = [
    {
      phone: '9800000001',
      name: 'Sunita Patil',
      email: 'sunita.patil@swasthyasetu.gov.in',
      role: UserRole.CITIZEN,
      preferredLanguage: 'mr',
    },
    {
      phone: '9800000002',
      name: 'Priya Shinde (CHW)',
      email: 'priya.shinde@swasthyasetu.gov.in',
      role: UserRole.CHW,
      preferredLanguage: 'mr',
    },
    {
      phone: '9800000003',
      name: 'Dr. Neha Kulkarni',
      email: 'dr.neha@swasthyasetu.gov.in',
      role: UserRole.DOCTOR,
      preferredLanguage: 'en',
    },
    {
      phone: '9800000004',
      name: 'Dhanukarwadi Admin',
      email: 'admin.dhanukarwadi@swasthyasetu.gov.in',
      role: UserRole.FACILITY_ADMIN,
      preferredLanguage: 'en',
    },
    {
      phone: '9800000005',
      name: 'Dr. Anand Mehta (DHO)',
      email: 'dho.mumbai@swasthyasetu.gov.in',
      role: UserRole.DISTRICT_OFFICER,
      preferredLanguage: 'en',
    },
    {
      phone: '9800000006',
      name: 'Dr. Rajesh Sharma (DDU2)',
      email: 'dr.rajesh@swasthyasetu.gov.in',
      role: UserRole.DOCTOR,
      preferredLanguage: 'en',
    },
    {
      phone: '9800000007',
      name: 'Aarav Gaikwad',
      email: 'aarav.gaikwad@swasthyasetu.gov.in',
      role: UserRole.CITIZEN,
      preferredLanguage: 'mr',
    },
    {
      phone: '9800000008',
      name: 'Meena Sharma',
      email: 'meena.sharma@swasthyasetu.gov.in',
      role: UserRole.CITIZEN,
      preferredLanguage: 'hi',
    },
    {
      phone: '9800000009',
      name: 'Super Admin',
      email: 'superadmin@swasthyasetu.gov.in',
      role: UserRole.SUPER_ADMIN,
      preferredLanguage: 'en',
    },
  ];

  const createdUsers: Record<string, any> = {};
  for (const p of personas) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: {
        name: p.name,
        email: p.email,
        role: p.role,
        preferredLanguage: p.preferredLanguage,
        active: true,
        demoUser: true,
      },
      create: {
        name: p.name,
        phone: p.phone,
        email: p.email,
        role: p.role,
        preferredLanguage: p.preferredLanguage,
        active: true,
        demoUser: true,
      },
    });
    createdUsers[p.phone] = user;
  }
  console.log(`Upserted ${Object.keys(createdUsers).length} core demo personas`);

  // 2. Facility Memberships & Scopes (Section 3 & 68)
  await prisma.facilityMembership.deleteMany({});
  await prisma.chwAssignment.deleteMany({});
  await prisma.districtAssignment.deleteMany({});

  // Dr. Neha -> Dhanukarwadi
  await prisma.facilityMembership.create({
    data: {
      userId: createdUsers['9800000003'].id,
      facilityId: dhanukarwadi.id,
      membershipRole: 'DOCTOR',
      active: true,
    },
  });

  // Dhanukarwadi Admin -> Dhanukarwadi
  await prisma.facilityMembership.create({
    data: {
      userId: createdUsers['9800000004'].id,
      facilityId: dhanukarwadi.id,
      membershipRole: 'FACILITY_ADMIN',
      active: true,
    },
  });

  // Dr. Rajesh Sharma -> DDU2 RCH UPHC
  await prisma.facilityMembership.create({
    data: {
      userId: createdUsers['9800000006'].id,
      facilityId: ddu2.id,
      membershipRole: 'DOCTOR',
      active: true,
    },
  });

  // Priya Shinde (CHW) -> Assigned to Dhanukarwadi & Catchment
  await prisma.chwAssignment.create({
    data: {
      userId: createdUsers['9800000002'].id,
      facilityId: dhanukarwadi.id,
      catchmentCode: 'KANDIVALI_R_SOUTH',
      pincode: '400067',
      active: true,
    },
  });

  // Dr. Anand Mehta -> District Assignment
  await prisma.districtAssignment.create({
    data: {
      userId: createdUsers['9800000005'].id,
      districtCode: 'MUMBAI_SUBURBAN',
      active: true,
    },
  });
  console.log('Created facility memberships and role assignments');

  // 3. Practitioners
  await prisma.practitioner.deleteMany({});
  await prisma.practitioner.create({
    data: {
      userId: createdUsers['9800000003'].id,
      facilityId: dhanukarwadi.id,
      designation: 'Medical Officer',
      specialty: 'General Medicine',
      licenseNumber: 'MMC-2024-1001',
      active: true,
    },
  });
  await prisma.practitioner.create({
    data: {
      userId: createdUsers['9800000006'].id,
      facilityId: ddu2.id,
      designation: 'Senior Medical Officer',
      specialty: 'General Medicine',
      licenseNumber: 'MMC-2024-1002',
      active: true,
    },
  });

  // 4. Clean and seed Patients (Section 69)
  await prisma.queueToken.deleteMany({});
  await prisma.appointment.deleteMany({ where: { demoData: true } });
  await prisma.encounter.deleteMany({ where: { demoData: true } });
  await prisma.referral.deleteMany({ where: { demoData: true } });
  await prisma.patient.deleteMany({ where: { demoData: true } });

  // Patient A: Sunita Patil (Citizen A)
  const patientA = await prisma.patient.create({
    data: {
      userId: createdUsers['9800000001'].id,
      patientCode: 'MH-P-000101',
      firstName: 'Sunita',
      lastName: 'Patil',
      dateOfBirth: new Date('1988-06-15'),
      sex: 'FEMALE',
      phone: '9800000001',
      address: 'Room 12, Chawl 4, Dhanukarwadi, Kandivali West',
      pincode: '400067',
      latitude: 19.207,
      longitude: 72.838,
      registeredByUserId: createdUsers['9800000002'].id, // Registered by CHW Priya
      registeredAtFacilityId: dhanukarwadi.id,
      catchmentCode: 'KANDIVALI_R_SOUTH',
      abhaReference: '91-4567-8901-2345',
      demoData: true,
    },
  });

  // Patient B: Aarav Gaikwad (Citizen B)
  const patientB = await prisma.patient.create({
    data: {
      userId: createdUsers['9800000007'].id,
      patientCode: 'MH-P-000102',
      firstName: 'Aarav',
      lastName: 'Gaikwad',
      dateOfBirth: new Date('1984-11-20'),
      sex: 'MALE',
      phone: '9800000007',
      address: 'Sector 2, Charkop, Kandivali West',
      pincode: '400067',
      latitude: 19.215,
      longitude: 72.829,
      registeredByUserId: createdUsers['9800000002'].id,
      registeredAtFacilityId: dhanukarwadi.id,
      catchmentCode: 'KANDIVALI_R_SOUTH',
      demoData: true,
    },
  });

  // Patient C: Meena Sharma (Citizen C - registered at DDU2)
  const patientC = await prisma.patient.create({
    data: {
      userId: createdUsers['9800000008'].id,
      patientCode: 'MH-P-000103',
      firstName: 'Meena',
      lastName: 'Sharma',
      dateOfBirth: new Date('1995-02-10'),
      sex: 'FEMALE',
      phone: '9800000008',
      address: 'Near Station, DDU Nagar',
      pincode: '400081',
      latitude: 19.165,
      longitude: 72.85,
      registeredAtFacilityId: ddu2.id,
      demoData: true,
    },
  });

  // Additional 20 synthetic patients
  const otherPatients = [];
  for (let i = 1; i <= 20; i++) {
    const pat = await prisma.patient.create({
      data: {
        patientCode: `MH-P-${String(200 + i).padStart(6, '0')}`,
        firstName: `CommunityPatient${i}`,
        lastName: `Jadhav`,
        dateOfBirth: new Date('1990-01-01'),
        sex: i % 2 === 0 ? 'FEMALE' : 'MALE',
        phone: `98100${String(i).padStart(5, '0')}`,
        pincode: '400067',
        registeredAtFacilityId: dhanukarwadi.id,
        demoData: true,
      },
    });
    otherPatients.push(pat);
  }
  console.log(`Created ${3 + otherPatients.length} demo patients`);

  // 5. Multi-PHC Queues & Counters (Section 17, 70)
  await prisma.queueCounter.deleteMany({});

  // Dhanukarwadi UPHC Queue setup
  await prisma.queueCounter.create({
    data: {
      facilityId: dhanukarwadi.id,
      serviceDate,
      department: 'GENERAL_MEDICINE',
      lastIssuedNumber: 42,
    },
  });

  // In consultation: GM-037
  await prisma.queueToken.create({
    data: {
      facilityId: dhanukarwadi.id,
      patientId: otherPatients[0].id,
      serviceDate,
      department: 'GENERAL_MEDICINE',
      tokenSequence: 37,
      tokenPrefix: 'GM',
      displayNumber: 'GM-037',
      priority: 10,
      status: QueueStatus.IN_CONSULTATION,
      calledAt: new Date(Date.now() - 10 * 60000),
      consultationStartedAt: new Date(Date.now() - 8 * 60000),
      source: 'WALK_IN',
    },
  });

  // Waiting: GM-038 to GM-041
  for (let s = 38; s <= 41; s++) {
    await prisma.queueToken.create({
      data: {
        facilityId: dhanukarwadi.id,
        patientId: otherPatients[s - 37].id,
        serviceDate,
        department: 'GENERAL_MEDICINE',
        tokenSequence: s,
        tokenPrefix: 'GM',
        displayNumber: `GM-0${s}`,
        priority: 10,
        status: QueueStatus.WAITING,
        estimatedWaitMinutes: (s - 37) * 8,
        source: 'WALK_IN',
      },
    });
  }

  // Appointment & Token GM-042 for Sunita Patil (Citizen A)
  const sunitaApp = await prisma.appointment.create({
    data: {
      patientId: patientA.id,
      facilityId: dhanukarwadi.id,
      department: 'GENERAL_MEDICINE',
      serviceDate,
      appointmentDate: new Date('2026-09-11T10:30:00.000Z'),
      startTime: '10:30',
      endTime: '11:00',
      tokenNumber: 'GM-042',
      status: AppointmentStatus.BOOKED,
      source: 'CITIZEN',
      demoData: true,
    },
  });

  await prisma.queueToken.create({
    data: {
      facilityId: dhanukarwadi.id,
      appointmentId: sunitaApp.id,
      patientId: patientA.id,
      serviceDate,
      department: 'GENERAL_MEDICINE',
      tokenSequence: 42,
      tokenPrefix: 'GM',
      displayNumber: 'GM-042',
      priority: 10,
      status: QueueStatus.WAITING,
      estimatedWaitMinutes: 18,
      source: 'APPOINTMENT',
    },
  });

  // Deonar / DDU2 Independent Queue (GM-001 ... GM-021)
  await prisma.queueCounter.create({
    data: {
      facilityId: ddu2.id,
      serviceDate,
      department: 'GENERAL_MEDICINE',
      lastIssuedNumber: 21,
    },
  });

  for (let s = 1; s <= 21; s++) {
    await prisma.queueToken.create({
      data: {
        facilityId: ddu2.id,
        patientId: patientC.id,
        serviceDate,
        department: 'GENERAL_MEDICINE',
        tokenSequence: s,
        tokenPrefix: 'GM',
        displayNumber: `GM-${String(s).padStart(3, '0')}`,
        priority: 10,
        status: s < 15 ? QueueStatus.COMPLETED : s === 15 ? QueueStatus.IN_CONSULTATION : QueueStatus.WAITING,
        source: 'WALK_IN',
      },
    });
  }
  console.log('Created multi-PHC independent queue counters and tokens');

  // 6. Referrals & Follow-ups
  const ref = await prisma.referral.create({
    data: {
      patientId: patientA.id,
      sourceFacilityId: dhanukarwadi.id,
      destinationFacilityId: shirodkar.id,
      createdById: createdUsers['9800000003'].id,
      reason: 'Specialist obstetric ultrasound evaluation',
      urgency: Urgency.MEDIUM,
      status: ReferralStatus.ACCEPTED,
      acceptedAt: new Date(Date.now() - 2 * 3600000),
      demoData: true,
    },
  });

  await prisma.referralEvent.create({
    data: {
      referralId: ref.id,
      eventType: ReferralEventType.CREATED,
      performedBy: 'Dr. Neha Kulkarni',
      metadata: { note: 'Referral initiated from UPHC' },
    },
  });
  await prisma.referralEvent.create({
    data: {
      referralId: ref.id,
      eventType: ReferralEventType.ACCEPTED,
      performedBy: 'Shirodkar Maternity Admin',
      metadata: { note: 'Bed and specialist slot verified' },
    },
  });

  await prisma.followUp.create({
    data: {
      patientId: patientA.id,
      type: 'POST_REFERRAL_REVIEW',
      dueDate: new Date(Date.now() + 3 * 86400000),
      status: FollowUpStatus.PENDING,
      notes: 'Check ultrasound results and maternal vitals',
      demoData: true,
    },
  });

  console.log('Deterministic Demo Seed Complete!');
}

if (process.argv[1] && process.argv[1].includes('generate-demo-data')) {
  generateDemoData()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Demo generation error:', err);
      process.exit(1);
    });
}
