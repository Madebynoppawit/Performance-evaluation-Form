import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

/* Load .env into process.env (no-op if vars already set by the platform).
   Under NODE_ENV=test, .env.test (committed, dummy values) takes precedence so
   the suite boots without a real .env in CI. */
loadDotenv()
if (process.env.NODE_ENV === 'test') loadDotenv({ path: '.env.test', override: true })

const NODE_ENVS = ['development', 'test', 'production'] as const

/* Comma-separated origin list → string[] (trimmed, empty removed). */
const csv = z
  .string()
  .transform(s => s.split(',').map(o => o.trim()).filter(Boolean))

const schema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').url('DATABASE_URL must be a valid connection URL'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  /* Accept CLIENT_URL (single) or CORS_ORIGINS (list); both feed the allowlist. */
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: csv.optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  /* Error monitoring — when set, Sentry activates; otherwise dormant.
     Empty string (from an unset .env line) is treated as "not configured". */
  SENTRY_DSN: z.preprocess(
    v => (v === '' ? undefined : v),
    z.string().url().optional()
  ),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map(i => `  • ${i.path.join('.')}: ${i.message}`).join('\n')
  console.error(`\n[env] Invalid environment configuration:\n${issues}\n`)
  console.error('[env] See .env.example for the full list of variables.\n')
  process.exit(1)
}

const raw = parsed.data
const isProd = raw.NODE_ENV === 'production'

/* ── Production hardening guards ─────────────────────────────────────────────
   Fail fast in production on weak/placeholder secrets. */
if (isProd) {
  const weakSecret =
    raw.JWT_SECRET.length < 32 ||
    raw.JWT_SECRET === 'dev-secret' ||
    raw.JWT_SECRET.includes('change-this')
  if (weakSecret) {
    console.error('[env] FATAL: JWT_SECRET is weak or a placeholder. In production it must be a random string ≥ 32 chars.')
    console.error('[env] Generate one with:  openssl rand -base64 48\n')
    process.exit(1)
  }
} else {
  if (raw.JWT_SECRET === 'dev-secret' || raw.JWT_SECRET.includes('change-this')) {
    console.warn('[env] ⚠️  Insecure JWT_SECRET (dev only). Set a strong value before deploying.')
  }
}

/* Final CORS allowlist: explicit list wins, else the single client URL. */
const corsOrigins = raw.CORS_ORIGINS?.length ? raw.CORS_ORIGINS : [raw.CLIENT_URL]

export const env = {
  ...raw,
  corsOrigins,
  isProd,
  isDev: raw.NODE_ENV === 'development',
  isTest: raw.NODE_ENV === 'test',
}

export type Env = typeof env
