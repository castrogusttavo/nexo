import { z } from 'zod'

const publicEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_AXIOM_TOKEN: process.env.NEXT_PUBLIC_AXIOM_TOKEN,
  NEXT_PUBLIC_AXIOM_DATASET: process.env.NEXT_PUBLIC_AXIOM_DATASET,
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
}

const publicEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_AXIOM_TOKEN: z.string().startsWith('xaat-'),
  NEXT_PUBLIC_AXIOM_DATASET: z.string().min(1).max(128),
  NEXT_PUBLIC_URL: z.url().startsWith('http'),
  NEXT_PUBLIC_GA_ID: z.string().startsWith('G-').optional(),
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
  NEXT_PUBLIC_GA_ID,
} = validatedPublicEnv
