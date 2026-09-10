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
  console.log('Starting deterministic Demo Data Generation...');

  const facilities = await prisma.facility.findMany();
  if (facilities.length === 0) {
    throw new Error('No facilities found. Please run data:import first.');
  }

  const dhanukarwadi = facilities.find((f) => f.name.includes('Dhanukarwadi')) || facilities[0];
  const shirodkar = facilities.find((f) => f.name.includes('Shirodkar')) || facilities[1];
  const ambedkar = facilities.find((f) => f.name.includes('Ambedkar')) || facilities[2];
  const deonar = facilities.find((f) => f.name.includes('Deonar')) || facilities[3];

  // 1. Core Personas & Users (Section 51 & 114)
  const usersData = [
    {
      name: 'Rajesh Patil',
      phone: '9000000001',
      email: 'rajesh.patil.demo@mahaswasthya.gov.in',
      role: UserRole.CITIZEN,
      preferredLanguage: 'mr',
    },
    {
      name: 'Demo ASHA Worker',
      phone: '9000000002',
      email: 'asha.demo@mahaswasthya.gov.in',
      role: UserRole.FRONTLINE_WORKER,
      preferredLanguage: 'mr',
    },
    {
      name: 'Demo General Medicine Doctor',
      phone: '9000000003',
      email: 'doctor.gm.demo@mahaswasthya.gov.in',
      role: UserRole.DOCTOR,
      preferredLanguage: 'en',
    },
    {
      name: 'Demo Facility Admin',
      phone: '9000000004',
      email: 'admin.facility.demo@mahaswasthya.gov.in',
      role: UserRole.FACILITY_ADMIN,
      preferredLanguage: 'en',
    },
    {
      name: 'Demo District Admin',
      phone: '9000000005',
      email: 'admin.district.demo@mahaswasthya.gov.in',
      role: UserRole.DISTRICT_ADMIN,
      preferredLanguage: 'en',
    },
    {
      name: 'Demo Super Admin',
      phone: '9000000006',
      email: 'superadmin.demo@mahaswasthya.gov.in',
      role: UserRole.SUPER_ADMIN,
      preferredLanguage: 'en',
    },
    {
      name: 'Meena Sharma',
      phone: '9000000011',
      email: 'meena.sharma.demo@mahaswasthya.gov.in',
      role: UserRole.CITIZEN,
      preferredLanguage: 'hi',
    },
    {
      name: 'Abdul Khan',
      phone: '9000000012',
      email: 'abdul.khan.demo@mahaswasthya.gov.in',
      role: UserRole.CITIZEN,
      preferredLanguage: 'en',
    },
    {
      name: 'Demo Obstetrics Doctor',
      phone: '9000000013',
      email: 'doctor.obg.demo@mahaswasthya.gov.in',
      role: UserRole.DOCTOR,
      preferredLanguage: 'en',
    },
  ];

  // Add more synthetic users to reach ~20
  for (let i = 14; i <= 25; i++) {
    usersData.push({
      name: `Synthetic Health Worker ${i}`,
      phone: `90000000${i}`,
      email: `worker.${i}.demo@mahaswasthya.gov.in`,
      role: i % 2 === 0 ? UserRole.FRONTLINE_WORKER : UserRole.DOCTOR,
      preferredLanguage: 'mr',
    });
  }

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      update: {
        name: u.name,
        email: u.email,
        role: u.role,
        preferredLanguage: u.preferredLanguage,
        demoUser: true,
      },
      create: {
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        preferredLanguage: u.preferredLanguage,
        demoUser: true,
      },
    });
    createdUsers[u.phone] = user;
  }
  console.log(`Upserted ${Object.keys(createdUsers).length} demo users`);

  // 2. Demo Capabilities for Facilities (Section 142)
  await prisma.facilityDemoCapability.deleteMany({ where: { demoData: true } });
  const capabilities = [
    { facilityId: dhanukarwadi.id, specialty: 'General Medicine', service: 'PRIMARY_ASSESSMENT', queueCapacity: 50 },
    { facilityId: dhanukarwadi.id, specialty: 'Primary Care', service: 'GENERAL_OUTPATIENT', queueCapacity: 40 },
    { facilityId: shirodkar.id, specialty: 'Obstetrics & Gynaecology', service: 'MATERNAL_CARE', queueCapacity: 30 },
    { facilityId: shirodkar.id, specialty: 'Paediatrics', service: 'CHILD_ASSESSMENT', queueCapacity: 25 },
    { facilityId: ambedkar.id, specialty: 'Obstetrics & Gynaecology', service: 'SPECIALIST_REVIEW', queueCapacity: 35 },
    { facilityId: deonar.id, specialty: 'General Medicine', service: 'PRIMARY_ASSESSMENT', queueCapacity: 45 },
  ];
  for (const cap of capabilities) {
    await prisma.facilityDemoCapability.create({
      data: {
        ...cap,
        demoData: true,
      },
    });
  }

  // 3. Practitioners (Section 50: ~20 practitioners)
  await prisma.practitioner.deleteMany({});
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
  console.log(`Created ${createdPractitioners.length} practitioners`);

  // 4. Synthetic Patients (Section 50: ~50 patients)
  // Clean existing demo patients
  await prisma.patient.deleteMany({ where: { demoData: true } });

  const primaryPatientsData = [
    {
      code: 'MH-P-000101',
      userId: createdUsers['9000000001'].id,
      firstName: 'Rajesh',
      lastName: 'Patil',
      dob: new Date('1985-04-12'),
      sex: 'MALE',
      phone: '9000000001',
      address: 'Near Station, Kandivali West',
      pincode: '400067',
      lat: 19.207,
      lng: 72.838,
      abha: '91-4567-8901-2345',
    },
    {
      code: 'MH-P-000102',
      userId: createdUsers['9000000011'].id,
      firstName: 'Meena',
      lastName: 'Sharma',
      dob: new Date('1992-08-23'),
      sex: 'FEMALE',
      phone: '9000000011',
      address: 'Kurla West Market',
      pincode: '400070',
      lat: 19.072,
      lng: 72.88,
      abha: '91-6789-0123-4567',
    },
    {
      code: 'MH-P-000103',
      userId: createdUsers['9000000012'].id,
      firstName: 'Abdul',
      lastName: 'Khan',
      dob: new Date('1978-11-05'),
      sex: 'MALE',
      phone: '9000000012',
      address: 'Shivaji Nagar, Govandi',
      pincode: '400043',
      lat: 19.055,
      lng: 72.925,
      abha: '91-8901-2345-6789',
    },
  ];

  const createdPatients = [];
  for (const p of primaryPatientsData) {
    const patient = await prisma.patient.create({
      data: {
        userId: p.userId,
        patientCode: p.code,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dob,
        sex: p.sex,
        phone: p.phone,
        address: p.address,
        pincode: p.pincode,
        latitude: p.lat,
        longitude: p.lng,
        abhaReference: p.abha,
        emergencyName: 'Family Contact',
        emergencyPhone: '9876543210',
        demoData: true,
      },
    });
    // Set PostGIS location point
    await prisma.$executeRawUnsafe(
      `UPDATE "Patient" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE "id" = $3::uuid`,
      p.lng,
      p.lat,
      patient.id
    );
    createdPatients.push(patient);
  }

  const firstNames = ['Aarav', 'Ananya', 'Sunita', 'Pooja', 'Vikram', 'Ramesh', 'Sanjay', 'Geeta', 'Kavita', 'Deepak'];
  const lastNames = ['Kadam', 'Chavan', 'More', 'Jadhav', 'Shinde', 'Gaikwad', 'Pawar', 'Deshmukh', 'Sawant', 'Bhosale'];

  for (let i = 4; i <= 50; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
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
        abhaReference: `91-0000-${String(i).padStart(4, '0')}-9999`,
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
  console.log(`Created ${createdPatients.length} synthetic patients`);

  // 5. Encounters and Triage Sessions (Section 50: ~50)
  await prisma.triageSession.deleteMany({});
  await prisma.encounter.deleteMany({ where: { demoData: true } });

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

    // Triage session
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
  console.log(`Created ${createdEncounters.length} encounters & triage sessions`);

  // 6. Appointments and Queue Tokens (Section 50: ~100)
  await prisma.queueToken.deleteMany({});
  await prisma.appointment.deleteMany({ where: { demoData: true } });

  const departments = ['GM', 'OBG', 'PED'];
  for (let i = 0; i < 100; i++) {
    const patient = createdPatients[i % createdPatients.length];
    const fac = facilities[i % facilities.length];
    const dept = departments[i % departments.length];
    const tokenNum = `${dept}-${String(i + 1).padStart(3, '0')}`;
    const dateOffset = Math.floor(i / 20) - 2; // spanning -2 to +2 days
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
  console.log(`Created 100 appointments and queue tokens`);

  // 7. Referrals & Events (Section 50: ~50 referrals, ~60+ events)
  await prisma.referralEvent.deleteMany({});
  await prisma.referral.deleteMany({ where: { demoData: true } });

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

    // Create sequence of ReferralEvents up to current status
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
  console.log(`Created 50 referrals with full event lifecycles`);

  // 8. Follow-ups (Section 50: ~40 follow-ups)
  await prisma.followUp.deleteMany({ where: { demoData: true } });
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
    const dueOffset = (i % 10) - 4; // -4 to +5 days
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
  console.log(`Created 40 follow-ups`);

  // 9. Medicines & Stock (Section 50: 20 medicines, 40 facility stock rows)
  await prisma.facilityMedicineStock.deleteMany({});
  await prisma.medicine.deleteMany({});

  const medicinesData = [
    { genericName: 'Paracetamol', brandName: 'Calpol', strength: '500mg', dosageForm: 'Tablet' },
    { genericName: 'Amoxicillin', brandName: 'Mox', strength: '250mg', dosageForm: 'Capsule' },
    { genericName: 'Oral Rehydration Salts', brandName: 'Electral', strength: '21.8g', dosageForm: 'Sachet' },
    { genericName: 'Iron & Folic Acid', brandName: 'IFA Red', strength: '100mg/0.5mg', dosageForm: 'Tablet' },
    { genericName: 'Metformin', brandName: 'Glycomet', strength: '500mg', dosageForm: 'Tablet' },
    { genericName: 'Amlodipine', brandName: 'Amlong', strength: '5mg', dosageForm: 'Tablet' },
    { genericName: 'Cetirizine', brandName: 'Cetzine', strength: '10mg', dosageForm: 'Tablet' },
    { genericName: 'Azithromycin', brandName: 'Azee', strength: '500mg', dosageForm: 'Tablet' },
    { genericName: 'Omeprazole', brandName: 'Omez', strength: '20mg', dosageForm: 'Capsule' },
    { genericName: 'Albendazole', brandName: 'Zentel', strength: '400mg', dosageForm: 'Chewable Tablet' },
    { genericName: 'Salbutamol', brandName: 'Asthalin', strength: '2mg', dosageForm: 'Tablet' },
    { genericName: 'Ciprofloxacin Eye Drops', brandName: 'Ciplox', strength: '0.3%', dosageForm: 'Drops' },
    { genericName: 'Zinc Sulfate', brandName: 'Zinconia', strength: '20mg', dosageForm: 'Tablet' },
    { genericName: 'Ibuprofen', brandName: 'Brufen', strength: '400mg', dosageForm: 'Tablet' },
    { genericName: 'Diclofenac Gel', brandName: 'Voveran', strength: '1%', dosageForm: 'Gel' },
    { genericName: 'Calcium & Vitamin D3', brandName: 'Shelcal', strength: '500mg', dosageForm: 'Tablet' },
    { genericName: 'Ranitidine', brandName: 'Rantac', strength: '150mg', dosageForm: 'Tablet' },
    { genericName: 'Metronidazole', brandName: 'Flagyl', strength: '400mg', dosageForm: 'Tablet' },
    { genericName: 'Doxycycline', brandName: 'Doxt', strength: '100mg', dosageForm: 'Capsule' },
    { genericName: 'Povidone Iodine Ointment', brandName: 'Betadine', strength: '5%', dosageForm: 'Ointment' },
  ];

  const createdMedicines = [];
  for (const m of medicinesData) {
    const med = await prisma.medicine.create({ data: m });
    createdMedicines.push(med);
  }

  // Stock rows across facilities
  let stockRows = 0;
  for (let f = 0; f < facilities.length && stockRows < 40; f++) {
    const fac = facilities[f];
    for (let m = 0; m < 4 && stockRows < 40; m++) {
      const med = createdMedicines[(f * 4 + m) % createdMedicines.length];
      await prisma.facilityMedicineStock.create({
        data: {
          facilityId: fac.id,
          medicineId: med.id,
          quantity: 50 + (m * 25) + (f * 10),
          status: ResourceStatus.AVAILABLE,
          demoData: true,
        },
      });
      stockRows++;
    }
  }
  console.log(`Created 20 medicines and ${stockRows} facility stock records`);

  // 10. Diagnostics (Section 50: ~30 diagnostics)
  await prisma.diagnosticService.deleteMany({ where: { demoData: true } });
  const diagnosticTests = [
    'Complete Blood Count (CBC)',
    'Blood Glucose (Fasting & PP)',
    'Urine Routine & Microscopy',
    'Rapid Malaria Antigen Test',
    'HIV Rapid Screening',
    'Syphilis (VDRL) Screening',
    'Hemoglobin (Sahli/Hemocue)',
    'Widal Test for Typhoid',
    'Sputum AFB for Tuberculosis',
    'Pregnancy Urine Test (UPT)',
  ];

  for (let i = 0; i < 30; i++) {
    const fac = facilities[i % facilities.length];
    const testName = diagnosticTests[i % diagnosticTests.length];
    await prisma.diagnosticService.create({
      data: {
        facilityId: fac.id,
        name: testName,
        category: i % 2 === 0 ? 'Hematology' : 'Biochemistry',
        status: ResourceStatus.AVAILABLE,
        lastUpdated: new Date(),
        demoData: true,
      },
    });
  }
  console.log(`Created 30 diagnostic service entries`);

  // 11. Notifications (Section 50: ~20)
  await prisma.notification.deleteMany({});
  const rajesh = createdUsers['9000000001'];
  for (let i = 0; i < 20; i++) {
    await prisma.notification.create({
      data: {
        userId: rajesh.id,
        title: i % 2 === 0 ? 'Appointment Confirmed' : 'Referral Update',
        body: i % 2 === 0 ? 'Your appointment at Dhanukarwadi UPHC has been scheduled.' : 'Your specialist referral has been accepted by Dr. V.N. Shirodkar Maternity Home.',
        type: i % 2 === 0 ? 'APPOINTMENT_BOOKED' : 'REFERRAL_ACCEPTED',
        data: { facilityName: 'Dhanukarwadi UPHC' },
        readAt: i > 10 ? new Date() : null,
      },
    });
  }
  console.log(`Created 20 demo notifications`);

  // 12. Primary Demo Scenario (Section 115)
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

  console.log('Demo Data Generation Complete!');
}

if (process.argv[1] === import.meta.filename) {
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
