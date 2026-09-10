import { z } from 'zod';

export const createReferralSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  sourceFacilityId: z.string().uuid(),
  destinationFacilityId: z.string().uuid(),
  reason: z.string().min(5),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export const bookReferralAppointmentSchema = z.object({
  appointmentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  startTime: z.string().default('11:00'),
  endTime: z.string().default('11:30'),
  notes: z.string().optional(),
});

export const listReferralsSchema = z.object({
  patientId: z.string().uuid().optional(),
  sourceFacilityId: z.string().uuid().optional(),
  destinationFacilityId: z.string().uuid().optional(),
  status: z.enum([
    'CREATED',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'APPOINTMENT_BOOKED',
    'PATIENT_ARRIVED',
    'CONSULTED',
    'FOLLOWUP_CREATED',
    'COMPLETED',
    'CANCELLED',
  ]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateReferralInput = z.infer<typeof createReferralSchema>;
