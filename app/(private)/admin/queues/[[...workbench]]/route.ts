import { type WorkbenchHandlers, workbench } from '@getworkbench/next'
import {
  getWorkbenchPass,
  getWorkbenchUser,
  isPlatformAdminEmail,
} from '@/lib/env/server-admin'
import { getAuthSession } from '@/src/lib/auth-session'
import { QueueName } from '@/src/lib/queue/jobs'
import { getQueueByName } from '@/src/lib/queue/queues'
import { standardError } from '@/utils/http-response'

// Route handlers ignore layouts, so `app/(private)/admin/layout.tsx` never
// runs for this path and the gate has to be repeated here by hand.
async function denyNonAdmin(): Promise<Response | null> {
  const session = await getAuthSession()
  // 404 rather than 401/403 for everyone who has no business here, for the
  // same reason the admin layout calls notFound(): the existence of an
  // operations dashboard is itself worth not confirming.
  if (!session.ok) return new Response(null, { status: 404 })

  const user = session.value.user
  if (!isPlatformAdminEmail(user.email))
    return new Response(null, { status: 404 })

  if (!user.twoFactorEnabled) {
    return standardError(
      'ADMIN_TWO_FACTOR_REQUIRED',
      'Ative a verificação em duas etapas para acessar a administração',
    )
  }

  return null
}

let handlers: WorkbenchHandlers | null = null

function getHandlers(): WorkbenchHandlers {
  if (handlers) return handlers

  handlers = workbench({
    // Listed explicitly, not auto-discovered. `@getworkbench/next` only scans
    // Redis through `WorkbenchCore.fromOptions`, and its `workbench()` helper
    // calls the constructor instead — passing `redis` alone builds a core with
    // an empty queue map, which is why the dashboard rendered its empty state
    // while jobs were being scheduled all along. Deriving the list from
    // QueueName also means a new queue shows up here the day it is declared,
    // and shows up even while it is still empty.
    queues: Object.values(QueueName).map(getQueueByName),
    basePath: '/admin/queues',
    // Second lock, not the only one: the session gate above already decided
    // who may reach the dashboard. This is what stands between an admin
    // session and the destructive actions (retry, remove, promote) the
    // dashboard exposes.
    auth: {
      username: getWorkbenchUser(),
      password: getWorkbenchPass(),
    },
  })

  return handlers
}

// Built on first request, never at import: reading the credentials eagerly
// would make every deployment without them fail at module load, which is how
// /careers and /jobs broke in production.
function handle(method: keyof WorkbenchHandlers) {
  return async (request: Request): Promise<Response> => {
    const denied = await denyNonAdmin()
    if (denied) return denied
    return getHandlers()[method](request)
  }
}

export const GET = handle('GET')
export const POST = handle('POST')
export const PUT = handle('PUT')
export const PATCH = handle('PATCH')
export const DELETE = handle('DELETE')
