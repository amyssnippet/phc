import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/mahaswasthya?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().default('mahaswasthya_jwt_access_secret_dev_key_2026_super_secure!'),
  JWT_REFRESH_SECRET: z.string().default('mahaswasthya_jwt_refresh_secret_dev_key_2026_super_secure!'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  OTP_MODE: z.enum(['MOCK', 'LIVE']).default('MOCK'),
  MOCK_OTP: z.string().default('123456'),
  DEMO_MODE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  LOG_LEVEL: z.string().default('info'),
});

export const env = envSchema.parse(process.env);
