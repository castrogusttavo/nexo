import { z } from 'zod'

const publicEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_AXIOM_TOKEN: process.env.NEXT_PUBLIC_AXIOM_TOKEN,
  NEXT_PUBLIC_AXIOM_DATASET: process.env.NEXT_PUBLIC_AXIOM_DATASET,
}

const publicEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_AXIOM_TOKEN: z.string().startsWith('xaat-'),
  NEXT_PUBLIC_AXIOM_DATASET: z.string().min(1).max(128),
})

const validatedPublicEnv =
  process.env.NODE_ENV === 'test'
    ? (publicEnv as z.infer<typeof publicEnvSchema>)
    : publicEnvSchema.parse(publicEnv)

export const {
  NODE_ENV,
  NEXT_PUBLIC_AXIOM_TOKEN,
  NEXT_PUBLIC_AXIOM_DATASET,
} = validatedPublicEnv
