import { z } from 'zod'

// Isolated from _server.ts on purpose: these vars back Next-only admin
// surfaces (the /jobs workbench UI and the /admin panel). The worker is a
// separate process that imports _server.ts transitively (via queue/connection.ts
// for REDIS_URL) but never these — bundling them into the shared schema made
// the worker's eager Zod parse fail on vars it never uses, crash-looping it
// in production whenever only the admin vars were missing.
//
// The same mistake then repeated twice at a smaller scale, which is why the
// two surfaces below validate separately and only when used:
//
//   1. Validating at module scope meant importing anything that transitively
//      reached this file demanded admin credentials. `CareerJobService` does,
//      for one authorization check, and `/careers` — a public page with no
//      login — imports that service to list open roles. Production has never
//      set WORKBENCH_USER, so every real render of /careers threw a ZodError
//      mid-stream: `failed to pipe response`, a truncated page, an error that
//      reads like a network fault.
//   2. Making the parse lazy but leaving one schema for all three variables
//      meant /jobs, which needs only the two workbench credentials, died on a
//      missing PLATFORM_ADMIN_EMAILS. One surface kept paying for another's
//      configuration.
//
// So: one schema per surface, each parsed on first use. A deployment that
// configures the workbench but not the admin list gets a working workbench.

const workbenchSchema = z.object({
  WORKBENCH_USER: z.string().min(3).max(63),
  WORKBENCH_PASS: z.string().min(8).max(128),
})

const platformAdminSchema = z.object({
  PLATFORM_ADMIN_EMAILS: z
    .string()
    .min(3)
    .transform((v) =>
      v.split(',').map((email) => email.trim().toLocaleLowerCase()),
    ),
})

/** `NODE_ENV=test` and SKIP_ENV_VALIDATION skip the parse, as everywhere else. */
function skipsValidation(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.SKIP_ENV_VALIDATION === 'true'
  )
}

let workbench: z.infer<typeof workbenchSchema> | null = null

function workbenchEnv(): z.infer<typeof workbenchSchema> {
  if (workbench) return workbench
  const raw = {
    WORKBENCH_USER: process.env.WORKBENCH_USER,
    WORKBENCH_PASS: process.env.WORKBENCH_PASS,
  }
  workbench = skipsValidation()
    ? (raw as unknown as z.infer<typeof workbenchSchema>)
    : workbenchSchema.parse(raw)
  return workbench
}

let platformAdmin: z.infer<typeof platformAdminSchema> | null = null

function platformAdminEnv(): z.infer<typeof platformAdminSchema> {
  if (platformAdmin) return platformAdmin
  const raw = { PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS }
  platformAdmin = skipsValidation()
    ? (raw as unknown as z.infer<typeof platformAdminSchema>)
    : platformAdminSchema.parse(raw)
  return platformAdmin
}

/** Basic-auth user for the /jobs workbench. Throws if unset. */
export const getWorkbenchUser = (): string => workbenchEnv().WORKBENCH_USER

/** Basic-auth password for the /jobs workbench. Throws if unset. */
export const getWorkbenchPass = (): string => workbenchEnv().WORKBENCH_PASS

/**
 * E-mails allowed into the platform admin surfaces, lowercased.
 *
 * Callers are authorization checks, so a deployment without the variable
 * refusing loudly is the correct outcome — as long as it refuses when someone
 * asks for admin, not when someone reads a job posting or opens the queue UI.
 */
export const getPlatformAdminEmails = (): string[] =>
  platformAdminEnv().PLATFORM_ADMIN_EMAILS

/** Test seam: drops both memoised parses so a case can change the environment. */
export function resetServerAdminEnvForTests(): void {
  workbench = null
  platformAdmin = null
}
