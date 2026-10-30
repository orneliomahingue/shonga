import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().url().default('http://localhost:9000'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  PAYMENT_SECRET: z.string().min(32).optional(),
  MARKETPLACE_COMMISSION_PERCENT: z.coerce.number().min(0).max(100).default(10),
  MOBILE_TRANSACTION_FEE_PERCENT: z.coerce.number().min(0).max(100).default(3),
  MPESA_MODE: z.enum(['mock', 'live']).default('mock'),
  MPESA_API_URL: z.string().url().optional(),
  MPESA_REFUND_URL: z.string().url().optional(),
  MPESA_API_KEY: z.string().optional(),
  MPESA_SERVICE_PROVIDER_CODE: z.string().optional(),
  MPESA_CALLBACK_SECRET: z.string().min(16).optional(),
})

export const env = schema.parse(process.env)
