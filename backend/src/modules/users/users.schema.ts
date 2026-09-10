import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().nullable().optional(),
  preferredLanguage: z.enum(['en', 'hi', 'mr']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
