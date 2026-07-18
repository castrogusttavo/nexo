import { z } from 'zod'

const serverEnv = {
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  POSTGRES_DB: process.env.POSTGRES_DB,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_TLS_ENABLED: process.env.REDIS_TLS_ENABLED,
  REDIS_TLS_CA_PATH: process.env.REDIS_TLS_CA_PATH,
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
  MINIO_USER: process.env.MINIO_USER,
  MINIO_PASSWORD: process.env.MINIO_PASSWORD,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_SECRETS: process.env.BETTER_AUTH_SECRETS,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  HUGEICONS_TOKEN: process.env.HUGEICONS_TOKEN,
  ABACATE_PAY: process.env.ABACATE_PAY,
  ABACATE_PAY_WEBHOOK_SECRET: process.env.ABACATE_PAY_WEBHOOK_SECRET,
  STATUS_COLLECTOR_SECRET: process.env.STATUS_COLLECTOR_SECRET,
  ACCOUNT_DELETION_GRACE_OVERRIDE_MS:
    process.env.ACCOUNT_DELETION_GRACE_OVERRIDE_MS,
}

const serverEnvSchema = z.object({
  POSTGRES_USER: z.string().min(2).max(63),
  POSTGRES_PASSWORD: z.string().min(8).max(128),
  POSTGRES_DB: z.string().min(1).max(63),
  DATABASE_URL: z.url().startsWith('postgresql://'),
  REDIS_URL: z
    .url()
    .refine((v) => v.startsWith('redis://') || v.startsWith('rediss://'), {
      message: 'REDIS_URL must start with redis:// or rediss://',
    }),
  REDIS_PASSWORD: z.string().min(8).max(128),
  REDIS_TLS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  REDIS_TLS_CA_PATH: z.string().min(1).optional(),
  MINIO_ENDPOINT: z.url().startsWith('http'),
  MINIO_USER: z.string().min(3).max(63),
  MINIO_PASSWORD: z.string().min(8).max(128),
  BETTER_AUTH_SECRET: z.string().min(16).startsWith('ba_'),
  BETTER_AUTH_SECRETS: z
    .string()
    .regex(/^\d+:.{32,}(,\d+:.{32,})*$/, {
      message:
        'BETTER_AUTH_SECRETS must be "v:secret[,v:secret...]" with secrets >= 32 chars',
    })
    .optional(),
  BETTER_AUTH_URL: z.url().startsWith('http'),
  GOOGLE_CLIENT_ID: z.string().min(10).endsWith('.apps.googleusercontent.com'),
  GOOGLE_CLIENT_SECRET: z.string().min(10).startsWith('GOCSPX-'),
  GITHUB_CLIENT_ID: z.string().min(10).max(40),
  GITHUB_CLIENT_SECRET: z.string().length(40),
  RESEND_API_KEY: z.string().startsWith('re_'),
  HUGEICONS_TOKEN: z.string().regex(/^[A-F0-9]{8}(-[A-F0-9]{8}){3}$/),
  ABACATE_PAY: z.string().min(1).max(100),
  ABACATE_PAY_WEBHOOK_SECRET: z.string().min(1).max(100),
  STATUS_COLLECTOR_SECRET: z.string().min(32).max(128),
  ACCOUNT_DELETION_GRACE_OVERRIDE_MS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
      message: 'ACCOUNT_DELETION_GRACE_OVERRIDE_MS must be a non-negative number',
    }),
})

const validatedServerEnv =
  process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true'
    ? (serverEnv as unknown as z.infer<typeof serverEnvSchema>)
    : serverEnvSchema.parse(serverEnv)

export const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  DATABASE_URL,
  REDIS_URL,
  REDIS_PASSWORD,
  REDIS_TLS_ENABLED,
  REDIS_TLS_CA_PATH,
  MINIO_ENDPOINT,
  MINIO_USER,
  MINIO_PASSWORD,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_SECRETS,
  BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  RESEND_API_KEY,
  HUGEICONS_TOKEN,
  ABACATE_PAY,
  ABACATE_PAY_WEBHOOK_SECRET,
  STATUS_COLLECTOR_SECRET,
  ACCOUNT_DELETION_GRACE_OVERRIDE_MS,
} = validatedServerEnv
