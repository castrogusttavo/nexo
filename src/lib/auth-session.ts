import { headers } from 'next/headers'
import { unauthorized } from '@/src/errors'
import { auth } from '@/src/lib/auth'
import { err, ok } from '@/src/lib/result'

export async function getAuthSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return err(unauthorized('Nao autenticado'))
  return ok(session)
}
