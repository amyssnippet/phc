import { z } from 'zod';

export const createTriageSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  symptoms: z.array(z.string()).default([]),
  vitals: z.object({
    temperatureC: z.number().nullable().optional(),
    heartRate: z.number().nullable().optional(),
    respiratoryRate: z.number().nullable().optional(),
    oxygenSaturation: z.number().nullable().optional(),
    bloodPressureSys: z.number().nullable().optional(),
    bloodPressureDia: z.number().nullable().optional(),
  }),
});

export type CreateTriageInput = z.infer<typeof createTriageSchema>;
