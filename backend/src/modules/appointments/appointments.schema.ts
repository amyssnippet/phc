import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  facilityId: z.string().uuid(),
  practitionerId: z.string().uuid().optional(),
  appointmentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/)),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('10:00'),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('10:15'),
  department: z.string().default('OPD'),
  source: z.string().default('CITIZEN'),
});

export const updateAppointmentSchema = z.object({
  appointmentDate: z.string().datetime().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(['BOOKED', 'CHECKED_IN', 'CALLED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
});

export const listAppointmentsSchema = z.object({
  facilityId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(['BOOKED', 'CHECKED_IN', 'CALLED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  date: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
