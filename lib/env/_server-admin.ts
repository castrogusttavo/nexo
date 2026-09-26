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

type ServerAdminEnv = z.infer<typeof serverAdminEnvSchema>

let cached: ServerAdminEnv | null = null

/**
 * The admin variables, validated on first use rather than on import.
 *
 * That distinction is the whole point of this function. These used to be
 * parsed at module scope, so *importing* anything that transitively reached
 * this file demanded the admin credentials — and `CareerJobService` reaches
 * it for one authorization check, while `/careers`, a public page with no
 * login, imports that service to list open roles. Production has never set
 * `WORKBENCH_USER`, so every real render of /careers threw a ZodError halfway
 * through the RSC stream: not a clean 500, but `failed to pipe response`, a
 * truncated page for the visitor and an error that reads like a network
 * problem. A load test made it visible; it had been there all along, hidden
 * behind the prerendered shell that serves most requests from cache.
 *
 * The same reasoning already applied to the worker, which is why this file
 * exists apart from `_server.ts` at all. It simply did not go far enough:
 * splitting the schema stopped one process from paying for variables it never
 * uses, and this stops one *route* from doing the same.
 */
function adminEnv(): ServerAdminEnv {
  if (cached) return cached
  cached =
    process.env.NODE_ENV === 'test' ||
    process.env.SKIP_ENV_VALIDATION === 'true'
      ? (serverAdminEnv as unknown as ServerAdminEnv)
      : serverAdminEnvSchema.parse(serverAdminEnv)
  return cached
}

/** Basic-auth user for the /jobs workbench. Throws if unset. */
export const getWorkbenchUser = (): string => adminEnv().WORKBENCH_USER

/** Basic-auth password for the /jobs workbench. Throws if unset. */
export const getWorkbenchPass = (): string => adminEnv().WORKBENCH_PASS

/**
 * E-mails allowed into the platform admin surfaces, lowercased.
 *
 * Callers are authorization checks, so a deployment without the variable
 * refusing loudly is the correct outcome — as long as it refuses when someone
 * asks for admin, not when someone reads a job posting.
 */
export const getPlatformAdminEmails = (): string[] =>
  adminEnv().PLATFORM_ADMIN_EMAILS

/** Test seam: drops the memoised parse so a case can change the environment. */
export function resetServerAdminEnvForTests(): void {
  cached = null
}
