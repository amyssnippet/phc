import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().nullable().optional(),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  phone: z.string().min(10).max(15).nullable().optional(),
  address: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  abhaReference: z.string().nullable().optional(),
  emergencyName: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const searchPatientSchema = z.object({
  q: z.string().optional(),
  pincode: z.string().optional(),
  patientCode: z.string().optional(),
  phone: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
