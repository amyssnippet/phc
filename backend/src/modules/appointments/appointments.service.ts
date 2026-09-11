import { prisma } from '../../config/database.js';
import { AppointmentStatus, QueueStatus } from '@prisma/client';
import { NotFoundError, DomainError, ForbiddenError } from '../../utils/errors.js';
import { CreateAppointmentInput, UpdateAppointmentInput } from './appointments.schema.js';
import { queueService } from '../queues/queues.service.js';
import { AuthContext } from '../../authz/scopes.js';
import { AuthorizationPolicy } from '../../authz/policy.js';

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

  async createAppointment(input: CreateAppointmentInput, actor?: AuthContext) {
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

    const appDate = new Date(input.appointmentDate);
    const weekday = appDate.getDay();
    const dayHour = facility.hours.find((h) => h.weekday === weekday && h.active);

    if (facility.hours.length > 0 && !dayHour) {
      throw new DomainError('Facility is closed on requested weekday', 'FACILITY_CLOSED');
    }

    const serviceDate = appDate.toISOString().slice(0, 10);
    const department = input.department || 'GENERAL_MEDICINE';

    // 2. Execute within an atomic transaction
    return prisma.$transaction(async (tx) => {
      // Create appointment record
      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          facilityId: facility.id,
          practitionerId: input.practitionerId || null,
          appointmentDate: appDate,
          serviceDate,
          department,
          startTime: input.startTime,
          endTime: input.endTime,
          status: AppointmentStatus.BOOKED,
          source: input.source || 'CITIZEN',
          demoData: true,
        },
      });

      // Atomically allocate sequential QueueToken (e.g. GM-042)
      const queueToken = await queueService.allocateQueueToken(
        {
          facilityId: facility.id,
          patientId: patient.id,
          appointmentId: appointment.id,
          serviceDate,
          department,
          priority: 10, // NORMAL
          source: 'APPOINTMENT',
        },
        tx
      );

      // Back-reference tokenNumber on appointment
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { tokenNumber: queueToken.displayNumber },
      });

      // Send confirmation notification
      const recipientUserId = patient.userId || actor?.userId;
      if (recipientUserId) {
        await tx.notification.create({
          data: {
            userId: recipientUserId,
            title: 'Appointment Confirmed',
            body: `Your appointment at ${facility.name} (${department}) is confirmed. Token: ${queueToken.displayNumber}`,
            type: 'APPOINTMENT_BOOKED',
            data: {
              appointmentId: appointment.id,
              facilityId: facility.id,
              displayNumber: queueToken.displayNumber,
            },
          },
        });
      }

      // Record audit
      await tx.auditLog.create({
        data: {
          actorId: actor?.userId || null,
          action: 'APPOINTMENT_CREATE',
          entityType: 'APPOINTMENT',
          entityId: appointment.id,
          metadata: {
            facilityId: facility.id,
            patientId: patient.id,
            tokenNumber: queueToken.displayNumber,
          },
        },
      });

      return {
        ...appointment,
        tokenNumber: queueToken.displayNumber,
        queueToken,
      };
    });
  }

  async getAppointmentById(id: string, actor?: AuthContext) {
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

    if (actor && !AuthorizationPolicy.canAccessAppointment(actor, { patientId: app.patientId, facilityId: app.facilityId })) {
      throw new ForbiddenError('You do not have permission to view this appointment', 'FORBIDDEN');
    }

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

  async cancelAppointment(id: string, actor?: AuthContext) {
    const app = await prisma.appointment.findUnique({ where: { id } });
    if (!app) throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');

    if (actor && !AuthorizationPolicy.canAccessAppointment(actor, { patientId: app.patientId, facilityId: app.facilityId })) {
      throw new ForbiddenError('You do not have permission to cancel this appointment', 'FORBIDDEN');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CANCELLED },
      });

      await tx.queueToken.updateMany({
        where: { appointmentId: id },
        data: { status: QueueStatus.CANCELLED },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor?.userId || null,
          action: 'APPOINTMENT_CANCEL',
          entityType: 'APPOINTMENT',
          entityId: id,
          metadata: { patientId: app.patientId, facilityId: app.facilityId },
        },
      });

      return updated;
    });
  }
}

export const appointmentService = new AppointmentService();
