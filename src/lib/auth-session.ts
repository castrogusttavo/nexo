import { headers } from 'next/headers'
import { connection } from 'next/server'
import { cache } from 'react'
import { unauthorized } from '@/src/errors'
import { auth } from '@/src/lib/auth'
import { err, ok } from '@/src/lib/result'

export const getAuthSession = cache(async () => {
  // Request time only. Better Auth checks the session's expiry against
  // `new Date()`, and when next dev prerenders a route's shell the headers()
  // read alone does not stop it from getting that far: Cache Components then
  // reports the clock read. connection() never resolves during a prerender.
  await connection()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return err(unauthorized('Nao autenticado'))
  return ok(session)
})
