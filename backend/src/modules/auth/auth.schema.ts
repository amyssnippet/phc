import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  role: z.enum(['CITIZEN', 'FRONTLINE_WORKER', 'DOCTOR', 'FACILITY_ADMIN', 'DISTRICT_ADMIN', 'SUPER_ADMIN']).optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().min(4).max(8),
  name: z.string().optional(),
  role: z.enum(['CITIZEN', 'FRONTLINE_WORKER', 'DOCTOR', 'FACILITY_ADMIN', 'DISTRICT_ADMIN', 'SUPER_ADMIN']).optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
