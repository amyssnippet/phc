import { z } from 'zod';

export const validRoles = [
  'CITIZEN',
  'CHW',
  'DOCTOR',
  'FACILITY_ADMIN',
  'DISTRICT_OFFICER',
  'SUPER_ADMIN',
  'FRONTLINE_WORKER',
  'DISTRICT_ADMIN',
  'ADMIN',
] as const;

export const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  role: z.enum(validRoles).optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().min(4).max(8),
  name: z.string().optional(),
  role: z.enum(validRoles).optional(),
});

export const demoLoginSchema = z.object({
  personaKey: z.string().optional(),
  phone: z.string().optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type DemoLoginInput = z.infer<typeof demoLoginSchema>;
