import { z } from 'zod';

export const joinQueueSchema = z.object({
  patientId: z.string().uuid(),
  department: z.string().default('OPD'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
});

export const completeQueueSchema = z.object({
  tokenId: z.string().uuid().optional(),
});
