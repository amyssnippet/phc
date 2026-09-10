import { prisma } from '../../config/database.js';
import { AppointmentStatus, QueueStatus, Urgency } from '@prisma/client';
import { NotFoundError, DomainError } from '../../utils/errors.js';
import { CreateAppointmentInput, UpdateAppointmentInput } from './appointments.schema.js';

export class AppointmentService {
  async listAppointments(params: {
    facilityId?: string;
    patientId?: string;
    status?: AppointmentStatus;
    date?: string;
    page: number;
    limit: number;
  }) {
    const { facilityId, patientId, status, date, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (facilityId) where.facilityId = facilityId;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.appointmentDate = { gte: d, lt: nextDay };
    }

    const [total, items] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: true,
          facility: true,
          queueToken: true,
        },
        orderBy: { appointmentDate: 'desc' },
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

  async createAppointment(input: CreateAppointmentInput, userId?: string) {
    // 1. Verify Patient and Facility
    const [patient, facility] = await Promise.all([
      prisma.patient.findUnique({ where: { id: input.patientId } }),
      prisma.facility.findUnique({
        where: { id: input.facilityId },
        include: { hours: true },
      }),
    ]);

    if (!patient) throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');
    if (!facility) throw new NotFoundError('Facility not found', 'FACILITY_NOT_FOUND');

    if (facility.operationalStatus === 'NON_FUNCTIONAL') {
      throw new DomainError('Selected facility is non-functional', 'FACILITY_CLOSED');
    }

    // 2. Validate day of week against facility hours
    const appDate = new Date(input.appointmentDate);
    const weekday = appDate.getDay();
    const dayHour = facility.hours.find((h) => h.weekday === weekday && h.active);

    if (facility.hours.length > 0 && !dayHour) {
      throw new DomainError('Facility is closed on requested weekday', 'FACILITY_CLOSED');
    }

    // 3. Generate token in transaction
    const dateStart = new Date(appDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(appDate);
    dateEnd.setHours(23, 59, 59, 999);

    return prisma.$transaction(async (tx) => {
      const countToday = await tx.appointment.count({
        where: {
          facilityId: facility.id,
          appointmentDate: { gte: dateStart, lte: dateEnd },
        },
      });

      const deptPrefix = input.department === 'MATERNAL_CARE' ? 'OBG' : input.department === 'CHILD_CARE' ? 'PED' : 'OPD';
      const tokenNumber = `${deptPrefix}-${String(countToday + 1).padStart(3, '0')}`;

      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          facilityId: facility.id,
          practitionerId: input.practitionerId || null,
          appointmentDate: appDate,
          startTime: input.startTime,
          endTime: input.endTime,
          tokenNumber,
          status: AppointmentStatus.BOOKED,
          source: input.source,
          demoData: true,
        },
      });

      const queueToken = await tx.queueToken.create({
        data: {
          facilityId: facility.id,
          appointmentId: appointment.id,
          department: input.department,
          tokenNumber,
          priority: Urgency.LOW,
          status: QueueStatus.WAITING,
          estimatedWaitMinutes: (countToday % 8 + 1) * 8,
        },
      });

      // Notification
      const recipientUserId = patient.userId || userId;
      if (recipientUserId) {
        await tx.notification.create({
          data: {
            userId: recipientUserId,
            title: 'Appointment Booked',
            body: `Your appointment at ${facility.name} is booked. Token: ${tokenNumber}`,
            type: 'APPOINTMENT_BOOKED',
            data: {
              appointmentId: appointment.id,
              facilityId: facility.id,
              tokenNumber,
            },
          },
        });
      }

      return {
        ...appointment,
        queueToken,
      };
    });
  }

  async getAppointmentById(id: string) {
    const app = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        facility: true,
        practitioner: true,
        queueToken: true,
      },
    });
    if (!app) throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
    return app;
  }

  async updateAppointment(id: string, input: UpdateAppointmentInput) {
    return prisma.appointment.update({
      where: { id },
      data: {
        ...(input.appointmentDate && { appointmentDate: new Date(input.appointmentDate) }),
        ...(input.startTime && { startTime: input.startTime }),
        ...(input.endTime && { endTime: input.endTime }),
        ...(input.status && { status: input.status }),
      },
    });
  }

  async checkInAppointment(id: string) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CHECKED_IN },
      });

      await tx.queueToken.updateMany({
        where: { appointmentId: id },
        data: { status: QueueStatus.WAITING },
      });

      return app;
    });
  }

  async cancelAppointment(id: string) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CANCELLED },
      });

      await tx.queueToken.updateMany({
        where: { appointmentId: id },
        data: { status: QueueStatus.CANCELLED },
      });

      return app;
    });
  }
}

export const appointmentService = new AppointmentService();
