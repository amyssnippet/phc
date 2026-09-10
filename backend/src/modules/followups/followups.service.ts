import { prisma } from '../../config/database.js';
import { FollowUpStatus } from '@prisma/client';
import { NotFoundError } from '../../utils/errors.js';
import { CreateFollowupInput } from './followups.schema.js';

export class FollowupService {
  async listFollowups(params: {
    patientId?: string;
    status?: FollowUpStatus;
    type?: string;
    page: number;
    limit: number;
  }) {
    const { patientId, status, type, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [total, items] = await Promise.all([
      prisma.followUp.count({ where }),
      prisma.followUp.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: true,
          encounter: { include: { facility: true } },
        },
        orderBy: { dueDate: 'asc' },
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

  async createFollowup(input: CreateFollowupInput) {
    return prisma.followUp.create({
      data: {
        patientId: input.patientId,
        encounterId: input.encounterId || null,
        type: input.type,
        dueDate: new Date(input.dueDate),
        status: FollowUpStatus.PENDING,
        assignedTo: input.assignedTo || 'ASHA Worker',
        notes: input.notes || null,
        demoData: true,
      },
      include: { patient: true },
    });
  }

  async getFollowupById(id: string) {
    const f = await prisma.followUp.findUnique({
      where: { id },
      include: {
        patient: true,
        encounter: { include: { facility: true } },
      },
    });
    if (!f) throw new NotFoundError('Followup not found', 'FOLLOWUP_NOT_FOUND');
    return f;
  }

  async completeFollowup(id: string, notes?: string) {
    return prisma.followUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.COMPLETED,
        completedAt: new Date(),
        ...(notes && { notes }),
      },
    });
  }
}

export const followupService = new FollowupService();
