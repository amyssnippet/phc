import { prisma } from '../../config/database.js';
import { ReferralStatus, ReferralEventType, AppointmentStatus, QueueStatus, Urgency } from '@prisma/client';
import { NotFoundError, DomainError } from '../../utils/errors.js';
import { CreateReferralInput } from './referrals.schema.js';

// Allowed state transitions map
const ALLOWED_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  [ReferralStatus.CREATED]: [ReferralStatus.SENT, ReferralStatus.CANCELLED],
  [ReferralStatus.SENT]: [ReferralStatus.ACCEPTED, ReferralStatus.REJECTED, ReferralStatus.CANCELLED],
  [ReferralStatus.ACCEPTED]: [ReferralStatus.APPOINTMENT_BOOKED, ReferralStatus.PATIENT_ARRIVED, ReferralStatus.CANCELLED],
  [ReferralStatus.APPOINTMENT_BOOKED]: [ReferralStatus.PATIENT_ARRIVED, ReferralStatus.CANCELLED],
  [ReferralStatus.PATIENT_ARRIVED]: [ReferralStatus.CONSULTED, ReferralStatus.CANCELLED],
  [ReferralStatus.CONSULTED]: [ReferralStatus.FOLLOWUP_CREATED, ReferralStatus.COMPLETED, ReferralStatus.CANCELLED],
  [ReferralStatus.FOLLOWUP_CREATED]: [ReferralStatus.COMPLETED, ReferralStatus.CANCELLED],
  [ReferralStatus.COMPLETED]: [],
  [ReferralStatus.REJECTED]: [],
  [ReferralStatus.CANCELLED]: [],
};

export class ReferralService {
  private validateTransition(currentStatus: ReferralStatus, newStatus: ReferralStatus) {
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new DomainError(
        `Cannot transition referral from ${currentStatus} to ${newStatus}`,
        'INVALID_REFERRAL_STATE_TRANSITION',
        { currentStatus, newStatus, allowedTransitions: allowed }
      );
    }
  }

  async listReferrals(params: {
    patientId?: string;
    sourceFacilityId?: string;
    destinationFacilityId?: string;
    status?: ReferralStatus;
    page: number;
    limit: number;
  }) {
    const { patientId, sourceFacilityId, destinationFacilityId, status, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (sourceFacilityId) where.sourceFacilityId = sourceFacilityId;
    if (destinationFacilityId) where.destinationFacilityId = destinationFacilityId;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.referral.count({ where }),
      prisma.referral.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: true,
          sourceFacility: true,
          destinationFacility: true,
          createdBy: { select: { id: true, name: true, role: true } },
          events: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
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

  async createReferral(input: CreateReferralInput, createdById: string) {
    const [patient, srcFac, destFac] = await Promise.all([
      prisma.patient.findUnique({ where: { id: input.patientId } }),
      prisma.facility.findUnique({ where: { id: input.sourceFacilityId } }),
      prisma.facility.findUnique({ where: { id: input.destinationFacilityId } }),
    ]);

    if (!patient) throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');
    if (!srcFac) throw new NotFoundError('Source facility not found', 'SOURCE_FACILITY_NOT_FOUND');
    if (!destFac) throw new NotFoundError('Destination facility not found', 'DEST_FACILITY_NOT_FOUND');

    return prisma.$transaction(async (tx) => {
      const referral = await tx.referral.create({
        data: {
          patientId: patient.id,
          encounterId: input.encounterId || null,
          sourceFacilityId: srcFac.id,
          destinationFacilityId: destFac.id,
          createdById,
          reason: input.reason,
          urgency: input.urgency,
          status: ReferralStatus.SENT,
          demoData: true,
        },
        include: {
          patient: true,
          sourceFacility: true,
          destinationFacility: true,
        },
      });

      // Events: CREATED and SENT
      await tx.referralEvent.create({
        data: {
          referralId: referral.id,
          eventType: ReferralEventType.CREATED,
          performedBy: 'Healthcare Practitioner',
          metadata: { reason: input.reason, urgency: input.urgency },
        },
      });

      await tx.referralEvent.create({
        data: {
          referralId: referral.id,
          eventType: ReferralEventType.SENT,
          performedBy: 'MahaSwasthya Routing Engine',
          metadata: { sentToFacility: destFac.name },
        },
      });

      // Destination facility admin notification
      const destAdmin = await tx.user.findFirst({
        where: { role: 'FACILITY_ADMIN' },
      });
      if (destAdmin) {
        await tx.notification.create({
          data: {
            userId: destAdmin.id,
            title: 'New Inbound Referral',
            body: `Inbound referral received for ${patient.firstName} ${patient.lastName || ''} from ${srcFac.name}.`,
            type: 'REFERRAL_CREATED',
            data: { referralId: referral.id },
          },
        });
      }

      // Patient notification
      if (patient.userId) {
        await tx.notification.create({
          data: {
            userId: patient.userId,
            title: 'Referral Initiated',
            body: `You have been referred to ${destFac.name} for specialist consultation.`,
            type: 'REFERRAL_CREATED',
            data: { referralId: referral.id },
          },
        });
      }

      return referral;
    });
  }

  async getReferralById(id: string) {
    const referral = await prisma.referral.findUnique({
      where: { id },
      include: {
        patient: true,
        sourceFacility: true,
        destinationFacility: true,
        createdBy: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!referral) throw new NotFoundError('Referral not found', 'REFERRAL_NOT_FOUND');
    return referral;
  }

  async getReferralTimeline(id: string) {
    const referral = await prisma.referral.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        sourceFacility: { select: { name: true } },
        destinationFacility: { select: { name: true } },
        patient: { select: { firstName: true, lastName: true, patientCode: true } },
      },
    });
    if (!referral) throw new NotFoundError('Referral not found', 'REFERRAL_NOT_FOUND');
    return referral;
  }

  async acceptReferral(id: string, performer = 'Receiving Facility Team') {
    const ref = await this.getReferralById(id);
    this.validateTransition(ref.status, ReferralStatus.ACCEPTED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id },
        data: {
          status: ReferralStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: { patient: true, destinationFacility: true },
      });

      await tx.referralEvent.create({
        data: {
          referralId: id,
          eventType: ReferralEventType.ACCEPTED,
          performedBy: performer,
          metadata: { note: 'Referral accepted by destination facility' },
        },
      });

      if (updated.patient.userId) {
        await tx.notification.create({
          data: {
            userId: updated.patient.userId,
            title: 'Referral Accepted',
            body: `Your referral has been accepted by ${updated.destinationFacility.name}.`,
            type: 'REFERRAL_ACCEPTED',
            data: { referralId: id },
          },
        });
      }

      return updated;
    });
  }

  async rejectReferral(id: string, reason: string, performer = 'Receiving Facility Team') {
    const ref = await this.getReferralById(id);
    this.validateTransition(ref.status, ReferralStatus.REJECTED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id },
        data: { status: ReferralStatus.REJECTED },
      });

      await tx.referralEvent.create({
        data: {
          referralId: id,
          eventType: ReferralEventType.REJECTED,
          performedBy: performer,
          metadata: { rejectionReason: reason },
        },
      });

      return updated;
    });
  }

  async bookAppointmentForReferral(
    id: string,
    appointmentData: { appointmentDate: string; startTime: string; endTime: string; notes?: string },
    performer = 'Facility Scheduling Staff'
  ) {
    const ref = await this.getReferralById(id);
    this.validateTransition(ref.status, ReferralStatus.APPOINTMENT_BOOKED);

    return prisma.$transaction(async (tx) => {
      const count = await tx.appointment.count({
        where: { facilityId: ref.destinationFacilityId },
      });
      const tokenNumber = `REF-${String(count + 1).padStart(3, '0')}`;

      const appointment = await tx.appointment.create({
        data: {
          patientId: ref.patientId,
          facilityId: ref.destinationFacilityId,
          appointmentDate: new Date(appointmentData.appointmentDate),
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          tokenNumber,
          status: AppointmentStatus.BOOKED,
          source: 'REFERRAL',
          demoData: true,
        },
      });

      await tx.queueToken.create({
        data: {
          facilityId: ref.destinationFacilityId,
          appointmentId: appointment.id,
          department: 'SPECIALIST',
          tokenNumber,
          priority: Urgency.HIGH,
          status: QueueStatus.WAITING,
          estimatedWaitMinutes: 15,
        },
      });

      const updated = await tx.referral.update({
        where: { id },
        data: {
          status: ReferralStatus.APPOINTMENT_BOOKED,
          appointmentId: appointment.id,
        },
      });

      await tx.referralEvent.create({
        data: {
          referralId: id,
          eventType: ReferralEventType.APPOINTMENT_BOOKED,
          performedBy: performer,
          metadata: {
            appointmentId: appointment.id,
            tokenNumber,
            date: appointmentData.appointmentDate,
          },
        },
      });

      return { referral: updated, appointment };
    });
  }

  async markPatientArrived(id: string, performer = 'Triage Staff') {
    const ref = await this.getReferralById(id);
    this.validateTransition(ref.status, ReferralStatus.PATIENT_ARRIVED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id },
        data: { status: ReferralStatus.PATIENT_ARRIVED },
      });

      await tx.referralEvent.create({
        data: {
          referralId: id,
          eventType: ReferralEventType.PATIENT_ARRIVED,
          performedBy: performer,
        },
      });

      if (ref.appointmentId) {
        await tx.appointment.update({
          where: { id: ref.appointmentId },
          data: { status: AppointmentStatus.CHECKED_IN },
        });
      }

      return updated;
    });
  }

  async markConsulted(id: string, performer = 'Attending Doctor') {
    const ref = await this.getReferralById(id);
    this.validateTransition(ref.status, ReferralStatus.CONSULTED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id },
        data: { status: ReferralStatus.CONSULTED },
      });

      await tx.referralEvent.create({
        data: {
          referralId: id,
          eventType: ReferralEventType.CONSULTED,
          performedBy: performer,
        },
      });

      return updated;
    });
  }

  async completeReferral(id: string, performer = 'Attending Clinician') {
    const ref = await this.getReferralById(id);
    this.validateTransition(ref.status, ReferralStatus.COMPLETED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id },
        data: {
          status: ReferralStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await tx.referralEvent.create({
        data: {
          referralId: id,
          eventType: ReferralEventType.COMPLETED,
          performedBy: performer,
        },
      });

      return updated;
    });
  }

  async cancelReferral(id: string, reason = 'Cancelled by user', performer = 'User') {
    const ref = await this.getReferralById(id);
    this.validateTransition(ref.status, ReferralStatus.CANCELLED);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id },
        data: { status: ReferralStatus.CANCELLED },
      });

      await tx.referralEvent.create({
        data: {
          referralId: id,
          eventType: ReferralEventType.CANCELLED,
          performedBy: performer,
          metadata: { reason },
        },
      });

      return updated;
    });
  }
}

export const referralService = new ReferralService();
