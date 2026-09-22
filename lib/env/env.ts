import { z } from 'zod'
import { POSTHOG_DEFAULT_HOST } from '@/lib/posthog/constants'

const publicEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_AXIOM_TOKEN: process.env.NEXT_PUBLIC_AXIOM_TOKEN,
  NEXT_PUBLIC_AXIOM_DATASET: process.env.NEXT_PUBLIC_AXIOM_DATASET,
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
  NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  // Defaulted here rather than with `.default()` on the schema: `NODE_ENV=test`
  // and `SKIP_ENV_VALIDATION=true` skip the parse entirely, and a host of
  // `undefined` there would send the reverse proxy nowhere.
  NEXT_PUBLIC_POSTHOG_HOST:
    process.env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_DEFAULT_HOST,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
}

const publicEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_AXIOM_TOKEN: z.string().startsWith('xaat-'),
  NEXT_PUBLIC_AXIOM_DATASET: z.string().min(1).max(128),
  NEXT_PUBLIC_URL: z.url().startsWith('http'),
  NEXT_PUBLIC_REALTIME_URL: z.url().startsWith('ws'),
  // Optional on purpose: unset means PostHog never loads and never requests
  // anything, which is what dev, CI and the test suites run with.
  NEXT_PUBLIC_POSTHOG_KEY: z.string().startsWith('phc_').optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().startsWith('https://'),
  // Same contract for Sentry: no DSN, no SDK, no network.
  NEXT_PUBLIC_SENTRY_DSN: z.url().startsWith('https://').optional(),
  NEXT_PUBLIC_SENTRY_RELEASE: z.string().min(1).max(200).optional(),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().min(1).max(64).optional(),
})

const validatedPublicEnv =
  process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true'
    ? (publicEnv as z.infer<typeof publicEnvSchema>)
    : publicEnvSchema.parse(publicEnv)

export const {
  NODE_ENV,
  NEXT_PUBLIC_AXIOM_TOKEN,
  NEXT_PUBLIC_AXIOM_DATASET,
  NEXT_PUBLIC_URL,
  NEXT_PUBLIC_REALTIME_URL,
  NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_RELEASE,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT,
} = validatedPublicEnv
