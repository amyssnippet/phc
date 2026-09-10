import { z } from 'zod';

export const careRoutingRequestSchema = z.object({
  patientId: z.string().uuid().optional(),
  symptoms: z.array(z.string()).default([]),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  requiredSpecialty: z.string().nullable().optional(),
  requiredService: z.string().default('PRIMARY_ASSESSMENT'),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export type CareRoutingInput = z.infer<typeof careRoutingRequestSchema>;
