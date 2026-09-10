import { z } from 'zod';

export const syncOperationSchema = z.object({
  operationId: z.string().min(1),
  entityType: z.enum(['PATIENT', 'TRIAGE', 'REFERRAL', 'FOLLOWUP', 'APPOINTMENT']),
  entityId: z.string().nullable().optional(),
  operation: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  payload: z.record(z.any()),
  clientCreatedAt: z.string().datetime().or(z.string()),
});

export const syncPushSchema = z.object({
  deviceId: z.string().min(1),
  operations: z.array(syncOperationSchema),
});

export const syncPullSchema = z.object({
  deviceId: z.string().min(1),
  since: z.string().datetime().optional(),
});

export type SyncPushInput = z.infer<typeof syncPushSchema>;
export type SyncPullInput = z.infer<typeof syncPullSchema>;
