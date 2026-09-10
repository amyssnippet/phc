import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { CreatePatientInput, UpdatePatientInput } from './patients.schema.js';

export class PatientService {
  async listPatients(params: {
    q?: string;
    pincode?: string;
    patientCode?: string;
    phone?: string;
    page: number;
    limit: number;
  }) {
    const { q, pincode, patientCode, phone, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { patientCode: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }
    if (pincode) where.pincode = pincode;
    if (patientCode) where.patientCode = patientCode;
    if (phone) where.phone = phone;

    const [total, items] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createPatient(input: CreatePatientInput) {
    const pCode = `MH-P-${Date.now().toString().slice(-6)}`;
    const dob = input.dateOfBirth ? new Date(input.dateOfBirth) : null;

    const patient = await prisma.patient.create({
      data: {
        patientCode: pCode,
        firstName: input.firstName,
        lastName: input.lastName || null,
        dateOfBirth: dob,
        sex: input.sex || null,
        phone: input.phone || null,
        address: input.address || null,
        pincode: input.pincode || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        abhaReference: input.abhaReference || null,
        emergencyName: input.emergencyName || null,
        emergencyPhone: input.emergencyPhone || null,
        demoData: true,
      },
    });

    if (input.latitude && input.longitude) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Patient" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE "id" = $3::uuid`,
        input.longitude,
        input.latitude,
        patient.id
      );
    }

    return patient;
  }

  async getPatientById(id: string) {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
      },
    });
    if (!patient) throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');
    return patient;
  }

  async updatePatient(id: string, input: UpdatePatientInput) {
    const dob = input.dateOfBirth ? new Date(input.dateOfBirth) : undefined;
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(dob !== undefined && { dateOfBirth: dob }),
        ...(input.sex !== undefined && { sex: input.sex }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.pincode !== undefined && { pincode: input.pincode }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.abhaReference !== undefined && { abhaReference: input.abhaReference }),
        ...(input.emergencyName !== undefined && { emergencyName: input.emergencyName }),
        ...(input.emergencyPhone !== undefined && { emergencyPhone: input.emergencyPhone }),
      },
    });

    if (input.latitude && input.longitude) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Patient" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE "id" = $3::uuid`,
        input.longitude,
        input.latitude,
        patient.id
      );
    }

    return patient;
  }

  async getPatientTimeline(patientId: string) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');

    const [appointments, encounters, referrals, followups] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId },
        include: { facility: { select: { id: true, name: true } }, queueToken: true },
        orderBy: { appointmentDate: 'desc' },
      }),
      prisma.encounter.findMany({
        where: { patientId },
        include: { facility: { select: { id: true, name: true } }, triageSession: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.referral.findMany({
        where: { patientId },
        include: {
          sourceFacility: { select: { id: true, name: true } },
          destinationFacility: { select: { id: true, name: true } },
          events: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.followUp.findMany({
        where: { patientId },
        orderBy: { dueDate: 'desc' },
      }),
    ]);

    // Consolidate into unified timeline
    const events: any[] = [];

    appointments.forEach((a) => {
      events.push({
        id: a.id,
        type: 'APPOINTMENT',
        date: a.appointmentDate,
        title: `Appointment at ${a.facility.name}`,
        status: a.status,
        details: { tokenNumber: a.tokenNumber, queueStatus: a.queueToken?.status },
      });
    });

    encounters.forEach((e) => {
      events.push({
        id: e.id,
        type: 'ENCOUNTER',
        date: e.createdAt,
        title: `Clinical Encounter (${e.type})`,
        status: e.status,
        details: {
          chiefComplaint: e.chiefComplaint,
          urgency: e.triageSession?.urgency,
          recommendedAction: e.triageSession?.recommendedAction,
        },
      });
    });

    referrals.forEach((r) => {
      events.push({
        id: r.id,
        type: 'REFERRAL',
        date: r.createdAt,
        title: `Referral from ${r.sourceFacility.name} to ${r.destinationFacility.name}`,
        status: r.status,
        details: {
          reason: r.reason,
          urgency: r.urgency,
          events: r.events,
        },
      });
    });

    followups.forEach((f) => {
      events.push({
        id: f.id,
        type: 'FOLLOWUP',
        date: f.dueDate,
        title: `Follow-up: ${f.type.replace('_', ' ')}`,
        status: f.status,
        details: { notes: f.notes, completedAt: f.completedAt },
      });
    });

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      patient: {
        id: patient.id,
        patientCode: patient.patientCode,
        name: `${patient.firstName} ${patient.lastName || ''}`.trim(),
        sex: patient.sex,
        phone: patient.phone,
        pincode: patient.pincode,
        abhaReference: patient.abhaReference,
      },
      events,
    };
  }

  async getPatientReferrals(patientId: string) {
    return prisma.referral.findMany({
      where: { patientId },
      include: {
        sourceFacility: true,
        destinationFacility: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPatientFollowups(patientId: string) {
    return prisma.followUp.findMany({
      where: { patientId },
      orderBy: { dueDate: 'desc' },
    });
  }

  async getPatientAppointments(patientId: string) {
    return prisma.appointment.findMany({
      where: { patientId },
      include: {
        facility: true,
        queueToken: true,
      },
      orderBy: { appointmentDate: 'desc' },
    });
  }
}

export const patientService = new PatientService();
