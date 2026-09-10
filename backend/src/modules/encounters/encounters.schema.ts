import { z } from 'zod';

export const createEncounterSchema = z.object({
  patientId: z.string().uuid(),
  facilityId: z.string().uuid(),
  practitionerId: z.string().uuid().optional(),
  type: z.string().default('PRIMARY_CARE'),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
});

export const updateEncounterSchema = z.object({
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

export type CreateEncounterInput = z.infer<typeof createEncounterSchema>;
export type UpdateEncounterInput = z.infer<typeof updateEncounterSchema>;
