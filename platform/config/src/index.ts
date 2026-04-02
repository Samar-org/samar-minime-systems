import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const ConfigSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // AI Providers
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLAMA_BASE_URL: z.string().url().default('http://localhost:11434/v1'),

  // Llama Fleet (hosted vLLM cluster)
  LLAMA_FLEET_URL: z.string().url().optional(),
  LLAMA_FLEET_API_KEY: z.string().optional(),
  LLAMA_FLEET_ENABLED: z.coerce.boolean().default(false),

  // S3 Storage
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_BUCKET: z.string().default('samar-artifacts'),
  S3_REGION: z.string().default('us-east-1'),

  // Temporal
  TEMPORAL_ADDRESS: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('samar-minime'),

  // API
  API_PORT: z.coerce.number().default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  API_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Dashboard
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),

  // Cost Control
  DEFAULT_PROJECT_BUDGET_USD: z.coerce.number().default(100),
  DEFAULT_TASK_BUDGET_USD: z.coerce.number().default(5),
  MAX_ESCALATION_RETRIES: z.coerce.number().int().default(3),

  // Model Defaults
  UTILITY_MODEL: z.string().default('gpt-3.5-turbo'),
  BUILDER_MODEL: z.string().default('gpt-4o-mini'),
  DIRECTOR_MODEL: z.string().default('gpt-4o'),
  SPECIALIST_MODEL: z.string().default('claude-sonnet-4-20250514'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    const result = ConfigSchema.safeParse(process.env);
    if (!result.success) {
      const missing = result.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Invalid configuration:\n${missing}`);
    }
    _config = result.data;
  }
  return _config;
}

export function resetConfig(): void {
  _config = null;
}