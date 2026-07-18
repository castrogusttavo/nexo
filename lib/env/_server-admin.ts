import { z } from 'zod'

// Isolated from _server.ts on purpose: these vars back Next-only admin
// surfaces (the /jobs workbench UI and the /admin panel). The worker is a
// separate process that imports _server.ts transitively (via queue/connection.ts
// for REDIS_URL) but never these — bundling them into the shared schema made
// the worker's eager Zod parse fail on vars it never uses, crash-looping it
// in production whenever only the admin vars were missing.
const serverAdminEnv = {
  WORKBENCH_USER: process.env.WORKBENCH_USER,
  WORKBENCH_PASS: process.env.WORKBENCH_PASS,
  PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS,
}

const serverAdminEnvSchema = z.object({
  WORKBENCH_USER: z.string().min(3).max(63),
  WORKBENCH_PASS: z.string().min(8).max(128),
  PLATFORM_ADMIN_EMAILS: z
    .string()
    .min(3)
    .transform((v) => v.split(',').map((email) => email.trim().toLocaleLowerCase())),
})

const validatedServerAdminEnv =
  process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true'
    ? (serverAdminEnv as unknown as z.infer<typeof serverAdminEnvSchema>)
    : serverAdminEnvSchema.parse(serverAdminEnv)

export const { WORKBENCH_USER, WORKBENCH_PASS, PLATFORM_ADMIN_EMAILS } =
  validatedServerAdminEnv
