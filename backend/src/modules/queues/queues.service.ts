import { prisma } from '../../config/database.js';
import { QueueStatus, AppointmentStatus, Urgency } from '@prisma/client';
import { NotFoundError, DomainError } from '../../utils/errors.js';

export class QueueService {
  async getFacilityQueue(facilityId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tokens = await prisma.queueToken.findMany({
      where: {
        facilityId,
        createdAt: { gte: today, lt: tomorrow },
      },
      include: {
        appointment: {
          include: { patient: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const waiting = tokens.filter((t) => t.status === QueueStatus.WAITING);
    const called = tokens.filter((t) => t.status === QueueStatus.CALLED);
    const completed = tokens.filter((t) => t.status === QueueStatus.COMPLETED);

    return {
      facilityId,
      totalTokensToday: tokens.length,
      waitingCount: waiting.length,
      currentCalled: called[0] || null,
      activeCalls: called,
      completedCount: completed.length,
      averageEstimatedWaitMinutes: waiting.length * 8,
      tokens,
    };
  }

  async joinQueue(facilityId: string, patientId: string, department = 'OPD', priority: Urgency = Urgency.LOW) {
    return prisma.$transaction(async (tx) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const countToday = await tx.queueToken.count({
        where: {
          facilityId,
          createdAt: { gte: today, lt: tomorrow },
        },
      });

      const tokenNumber = `${department.slice(0, 3).toUpperCase()}-${String(countToday + 1).padStart(3, '0')}`;

      // Create dummy appointment for walk-in token
      const app = await tx.appointment.create({
        data: {
          patientId,
          facilityId,
          appointmentDate: new Date(),
          startTime: 'NOW',
          endTime: 'NOW',
          tokenNumber,
          status: AppointmentStatus.CHECKED_IN,
          source: 'WALK_IN',
          demoData: true,
        },
      });

      const token = await tx.queueToken.create({
        data: {
          facilityId,
          appointmentId: app.id,
          department,
          tokenNumber,
          priority,
          status: QueueStatus.WAITING,
          estimatedWaitMinutes: (countToday + 1) * 8,
        },
        include: { appointment: { include: { patient: true } } },
      });

      return token;
    });
  }

  async callNext(facilityId: string) {
    return prisma.$transaction(async (tx) => {
      const nextToken = await tx.queueToken.findFirst({
        where: {
          facilityId,
          status: QueueStatus.WAITING,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
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
        include: { appointment: { include: { patient: true } } },
      });

      await tx.appointment.update({
        where: { id: nextToken.appointmentId },
        data: { status: AppointmentStatus.CALLED },
      });

      return updatedToken;
    });
  }

  async completeCurrent(facilityId: string, tokenId?: string) {
    return prisma.$transaction(async (tx) => {
      let targetToken;
      if (tokenId) {
        targetToken = await tx.queueToken.findUnique({ where: { id: tokenId } });
      } else {
        targetToken = await tx.queueToken.findFirst({
          where: {
            facilityId,
            status: QueueStatus.CALLED,
          },
          orderBy: { calledAt: 'desc' },
        });
      }

      if (!targetToken) {
        throw new DomainError('No currently called patient to complete', 'NO_CALLED_TOKEN');
      }

      const completed = await tx.queueToken.update({
        where: { id: targetToken.id },
        data: {
          status: QueueStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await tx.appointment.update({
        where: { id: targetToken.appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });

      return completed;
    });
  }
}

export const queueService = new QueueService();
