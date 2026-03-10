import { z } from 'zod';

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  APP_BASE_URL: z.string().url().default('http://localhost:8080'),
  API_BASE_URL: z.string().url().default('http://localhost:3001/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export const webEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3001/api/v1'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;

export function parseApiEnv(source: Record<string, string | undefined>): ApiEnv {
  return apiEnvSchema.parse(source);
}

export function parseWebEnv(source: Record<string, string | undefined>): WebEnv {
  return webEnvSchema.parse(source);
}
