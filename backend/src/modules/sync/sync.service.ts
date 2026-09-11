import { prisma } from '../../config/database.js';
import { SyncOperation, SyncStatus, ReferralStatus, ReferralEventType, FollowUpStatus, Urgency } from '@prisma/client';
import { SyncPushInput } from './sync.schema.js';

export class SyncService {
  async processPush(input: SyncPushInput, userId?: string) {
    const accepted: any[] = [];
    const conflicts: any[] = [];
    const failed: any[] = [];

    for (const op of input.operations) {
      try {
        // 1. Idempotency Check (Section 38.3 & 165)
        const existingSync = await prisma.syncEvent.findUnique({
          where: { operationId: op.operationId },
        });

        if (existingSync) {
          accepted.push({
            operationId: op.operationId,
            entityId: existingSync.entityId,
            status: existingSync.status,
            message: 'Idempotent duplicate acknowledged',
          });
          continue;
        }

        let resultingEntityId: string | null = null;

        // Process based on entity type and operation
        if (op.entityType === 'PATIENT' && op.operation === 'CREATE') {
          const p = op.payload;
          const patient = await prisma.patient.create({
            data: {
              patientCode: p.patientCode || `MH-P-${Date.now().toString().slice(-6)}`,
              firstName: p.firstName || 'Anonymous',
              lastName: p.lastName || null,
              phone: p.phone || null,
              address: p.address || null,
              pincode: p.pincode || null,
              registeredByUserId: userId || null,
              demoData: true,
            },
          });
          resultingEntityId = patient.id;
        } else if (op.entityType === 'REFERRAL' && op.operation === 'CREATE') {
          const p = op.payload;
          const creator = userId
            ? await prisma.user.findUnique({ where: { id: userId } })
            : await prisma.user.findFirst({ where: { role: 'CHW' } });

          const referral = await prisma.referral.create({
            data: {
              patientId: p.patientId,
              sourceFacilityId: p.sourceFacilityId,
              destinationFacilityId: p.destinationFacilityId,
              createdById: creator!.id,
              reason: p.reason || 'Offline draft synced referral',
              urgency: (p.urgency as Urgency) || Urgency.MEDIUM,
              status: ReferralStatus.SENT,
              demoData: true,
            },
          });

          await prisma.referralEvent.create({
            data: {
              referralId: referral.id,
              eventType: ReferralEventType.CREATED,
              performedBy: creator?.name || 'Offline Sync Client',
              metadata: { source: 'OFFLINE_SYNC', operationId: op.operationId },
            },
          });

          resultingEntityId = referral.id;
        } else if (op.entityType === 'FOLLOWUP' && op.operation === 'UPDATE') {
          const p = op.payload;
          const f = await prisma.followUp.findUnique({ where: { id: op.entityId || p.id } });
          if (f && f.status === FollowUpStatus.COMPLETED) {
            conflicts.push({
              operationId: op.operationId,
              entityId: f.id,
              code: 'SYNC_CONFLICT',
              message: 'Follow-up was already completed on server',
            });
            continue;
          }
          if (f) {
            await prisma.followUp.update({
              where: { id: f.id },
              data: {
                status: FollowUpStatus.COMPLETED,
                completedAt: new Date(),
                notes: p.notes || f.notes,
              },
            });
            resultingEntityId = f.id;
          }
        } else if (op.entityType === 'TRIAGE' && op.operation === 'CREATE') {
          const p = op.payload;
          const session = await prisma.triageSession.create({
            data: {
              patientId: p.patientId,
              encounterId: p.encounterId,
              symptoms: p.symptoms || [],
              vitals: p.vitals || {},
              riskFlags: p.riskFlags || [],
              urgency: p.urgency || Urgency.LOW,
              recommendedAction: p.recommendedAction || 'STANDARD_REVIEW',
            },
          });
          resultingEntityId = session.id;
        }

        // Record successful sync event
        await prisma.syncEvent.create({
          data: {
            clientId: input.deviceId,
            operationId: op.operationId,
            entityType: op.entityType,
            entityId: resultingEntityId,
            operation: op.operation as SyncOperation,
            payload: op.payload,
            status: SyncStatus.SYNCED,
            clientCreatedAt: new Date(op.clientCreatedAt),
          },
        });

        accepted.push({
          operationId: op.operationId,
          entityId: resultingEntityId,
          status: 'SYNCED',
        });
      } catch (err: any) {
        failed.push({
          operationId: op.operationId,
          error: err.message,
        });
      }
    }

    return {
      accepted,
      conflicts,
      failed,
      syncedCount: accepted.length,
    };
  }

  async processPull(deviceId: string, since?: string) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 3600 * 1000);

    const [facilities, referrals, followups] = await Promise.all([
      prisma.facility.findMany({
        where: { updatedAt: { gte: sinceDate } },
        select: {
          id: true,
          name: true,
          facilityType: true,
          operationalStatus: true,
          dataQualityScore: true,
        },
      }),
      prisma.referral.findMany({
        where: { updatedAt: { gte: sinceDate } },
        include: { events: true },
      }),
      prisma.followUp.findMany({
        where: { updatedAt: { gte: sinceDate } },
      }),
    ]);

    return {
      serverTime: new Date().toISOString(),
      changes: {
        facilities,
        referrals,
        followups,
      },
    };
  }

  async getStatus(deviceId: string) {
    const [syncedCount, pendingSyncs] = await Promise.all([
      prisma.syncEvent.count({ where: { clientId: deviceId, status: SyncStatus.SYNCED } }),
      prisma.syncEvent.count({ where: { clientId: deviceId, status: SyncStatus.PENDING } }),
    ]);

    const lastSync = await prisma.syncEvent.findFirst({
      where: { clientId: deviceId },
      orderBy: { serverCreatedAt: 'desc' },
    });

    return {
      deviceId,
      syncedCount,
      pendingCount: pendingSyncs,
      lastSyncTime: lastSync?.serverCreatedAt || null,
      status: 'ONLINE',
    };
  }
}

export const syncService = new SyncService();
