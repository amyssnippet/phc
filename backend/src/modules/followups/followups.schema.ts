import { z } from 'zod';

export const createFollowupSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  type: z.enum([
    'GENERAL_REVIEW',
    'MATERNAL_FOLLOWUP',
    'CHILD_FOLLOWUP',
    'DIABETES_REVIEW',
    'HYPERTENSION_REVIEW',
    'POST_REFERRAL_REVIEW',
  ]).default('GENERAL_REVIEW'),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export const listFollowupsSchema = z.object({
  patientId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'DUE', 'COMPLETED', 'MISSED', 'CANCELLED']).optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateFollowupInput = z.infer<typeof createFollowupSchema>;
