import { prisma } from '../../config/database.js';
import { QueueStatus, AppointmentStatus, Prisma } from '@prisma/client';
import { NotFoundError, DomainError, ForbiddenError } from '../../utils/errors.js';
import { AuthContext } from '../../authz/scopes.js';

export function getDepartmentPrefix(department: string): string {
  const dept = (department || 'GENERAL_MEDICINE').toUpperCase();
  if (dept.includes('GENERAL') || dept.includes('MEDICINE') || dept === 'OPD') return 'GM';
  if (dept.includes('PED')) return 'PED';
  if (dept.includes('GYN') || dept.includes('OBSTETRIC') || dept.includes('MATERNITY')) return 'OBG';
  if (dept.includes('EMERG') || dept.includes('CASUALTY')) return 'EM';
  if (dept.includes('DENT')) return 'DEN';
  return dept.slice(0, 3).toUpperCase();
}

export interface AllocateTokenInput {
  facilityId: string;
  patientId: string;
  appointmentId?: string | null;
  serviceDate?: string;
  department?: string;
  priority?: number; // 100=EMERGENCY, 75=HIGH, 50=PRIORITY, 10=NORMAL
  source?: string;
}

export class QueueService {
  /**
   * Atomically allocates a sequential, facility+date+department scoped QueueToken.
   * Race-condition safe using PostgreSQL row-level locks on QueueCounter.
   */
  async allocateQueueToken(input: AllocateTokenInput, existingTx?: Prisma.TransactionClient) {
    const runInTx = async (tx: Prisma.TransactionClient) => {
      const facility = await tx.facility.findUnique({ where: { id: input.facilityId } });
      if (!facility) {
        throw new NotFoundError('Facility not found', 'FACILITY_NOT_FOUND');
      }

      const serviceDate = input.serviceDate || new Date().toISOString().slice(0, 10);
      const department = input.department || 'GENERAL_MEDICINE';
      const prefix = getDepartmentPrefix(department);

      // Atomic sequence allocation via QueueCounter upsert
      const counter = await tx.queueCounter.upsert({
        where: {
          facilityId_serviceDate_department: {
            facilityId: input.facilityId,
            serviceDate,
            department,
          },
        },
        update: {
          lastIssuedNumber: { increment: 1 },
        },
        create: {
          facilityId: input.facilityId,
          serviceDate,
          department,
          lastIssuedNumber: 1,
        },
      });

      const sequence = counter.lastIssuedNumber;
      const displayNumber = `${prefix}-${String(sequence).padStart(3, '0')}`;

      // Calculate estimated wait time based on patients ahead
      const aheadCount = await tx.queueToken.count({
        where: {
          facilityId: input.facilityId,
          serviceDate,
          department,
          status: { in: [QueueStatus.WAITING, QueueStatus.CALLED] },
        },
      });
      const estimatedWaitMinutes = Math.max(5, (aheadCount + 1) * 8);

      const token = await tx.queueToken.create({
        data: {
          facilityId: input.facilityId,
          patientId: input.patientId,
          appointmentId: input.appointmentId || null,
          serviceDate,
          department,
          tokenSequence: sequence,
          tokenPrefix: prefix,
          displayNumber,
          priority: input.priority ?? 10,
          status: QueueStatus.WAITING,
          estimatedWaitMinutes,
          source: input.source || (input.appointmentId ? 'APPOINTMENT' : 'WALK_IN'),
        },
        include: {
          facility: { select: { id: true, name: true, facilityType: true } },
          patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
        },
      });

      return token;
    };

    if (existingTx) {
      return runInTx(existingTx);
    }
    return prisma.$transaction(runInTx);
  }

  /**
   * Workforce Live Queue View (scoped to facility)
   */
  async getFacilityQueue(facilityId: string, department?: string, serviceDate?: string) {
    const date = serviceDate || new Date().toISOString().slice(0, 10);

    const where: any = {
      facilityId,
      serviceDate: date,
    };
    if (department && department !== 'ALL') {
      where.department = department;
    }

    const tokens = await prisma.queueToken.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientCode: true,
            sex: true,
            dateOfBirth: true,
          },
        },
        appointment: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { tokenSequence: 'asc' },
      ],
    });

    const waiting = tokens.filter((t) => t.status === QueueStatus.WAITING);
    const called = tokens.filter((t) => t.status === QueueStatus.CALLED);
    const inConsultation = tokens.filter((t) => t.status === QueueStatus.IN_CONSULTATION);
    const completed = tokens.filter((t) => t.status === QueueStatus.COMPLETED);

    const currentlyServing = inConsultation[0] || called[0] || null;

    return {
      facilityId,
      serviceDate: date,
      department: department || 'ALL',
      totalTokens: tokens.length,
      waitingCount: waiting.length,
      currentlyServing,
      activeCalls: called,
      inConsultation,
      completedCount: completed.length,
      averageEstimatedWaitMinutes: waiting.length * 8,
      tokens,
    };
  }

  /**
   * Doctor / Facility Admin calls the next waiting patient
   */
  async callNext(facilityId: string, department?: string, actor?: AuthContext) {
    if (actor && !actor.isSuperAdmin && !actor.facilityIds.includes(facilityId)) {
      throw new ForbiddenError('You are not authorized to manage queues for this facility', 'FORBIDDEN');
    }

    return prisma.$transaction(async (tx) => {
      const today = new Date().toISOString().slice(0, 10);
      const where: any = {
        facilityId,
        serviceDate: today,
        status: QueueStatus.WAITING,
      };
      if (department) {
        where.department = department;
      }

      const nextToken = await tx.queueToken.findFirst({
        where,
        orderBy: [
          { priority: 'desc' },
          { tokenSequence: 'asc' },
        ],
      });

      if (!nextToken) {
        throw new DomainError('No waiting patients in queue', 'QUEUE_EMPTY');
      }

      const updatedToken = await tx.queueToken.update({
        where: { id: nextToken.id },
        data: {
          status: QueueStatus.CALLED,
          calledAt: new Date(),
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
        },
      });

      if (nextToken.appointmentId) {
        await tx.appointment.update({
          where: { id: nextToken.appointmentId },
          data: { status: AppointmentStatus.CALLED },
        });
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          actorId: actor?.userId || null,
          action: 'QUEUE_CALL_NEXT',
          entityType: 'QUEUE_TOKEN',
          entityId: updatedToken.id,
          metadata: {
            displayNumber: updatedToken.displayNumber,
            facilityId,
            calledAt: new Date().toISOString(),
          },
        },
      });

      return updatedToken;
    });
  }

  /**
   * Complete patient consultation
   */
  async completeConsultation(facilityId: string, tokenId?: string, actor?: AuthContext) {
    if (actor && !actor.isSuperAdmin && !actor.facilityIds.includes(facilityId)) {
      throw new ForbiddenError('You are not authorized to complete consultations for this facility', 'FORBIDDEN');
    }

    return prisma.$transaction(async (tx) => {
      let targetToken;
      if (tokenId) {
        targetToken = await tx.queueToken.findUnique({ where: { id: tokenId } });
      } else {
        const today = new Date().toISOString().slice(0, 10);
        targetToken = await tx.queueToken.findFirst({
          where: {
            facilityId,
            serviceDate: today,
            status: { in: [QueueStatus.CALLED, QueueStatus.IN_CONSULTATION] },
          },
          orderBy: { calledAt: 'desc' },
        });
      }

      if (!targetToken) {
        throw new DomainError('No currently active token to complete', 'NO_ACTIVE_TOKEN');
      }

      const completed = await tx.queueToken.update({
        where: { id: targetToken.id },
        data: {
          status: QueueStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      if (targetToken.appointmentId) {
        await tx.appointment.update({
          where: { id: targetToken.appointmentId },
          data: { status: AppointmentStatus.COMPLETED },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor?.userId || null,
          action: 'QUEUE_COMPLETE',
          entityType: 'QUEUE_TOKEN',
          entityId: completed.id,
          metadata: {
            displayNumber: completed.displayNumber,
            facilityId,
            completedAt: new Date().toISOString(),
          },
        },
      });

      return completed;
    });
  }

  /**
   * Citizen view: Only returns caller's own token and anonymous position
   */
  async getCitizenQueueStatus(patientId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const token = await prisma.queueToken.findFirst({
      where: {
        patientId,
        serviceDate: today,
        status: { in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_CONSULTATION] },
      },
      include: {
        facility: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) return null;

    // Find token currently serving in this department
    const currentServing = await prisma.queueToken.findFirst({
      where: {
        facilityId: token.facilityId,
        serviceDate: today,
        department: token.department,
        status: { in: [QueueStatus.CALLED, QueueStatus.IN_CONSULTATION] },
      },
      select: { displayNumber: true },
      orderBy: { calledAt: 'desc' },
    });

    // Count waiting tokens ahead with higher priority or earlier sequence
    const aheadCount = await prisma.queueToken.count({
      where: {
        facilityId: token.facilityId,
        serviceDate: today,
        department: token.department,
        status: QueueStatus.WAITING,
        OR: [
          { priority: { gt: token.priority } },
          { priority: token.priority, tokenSequence: { lt: token.tokenSequence } },
        ],
      },
    });

    return {
      token,
      currentlyServingNumber: currentServing?.displayNumber || 'None',
      aheadCount,
    };
  }
}

export const queueService = new QueueService();
