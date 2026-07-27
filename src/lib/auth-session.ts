import { headers } from 'next/headers'
import { cache } from 'react'
import { unauthorized } from '@/src/errors'
import { auth } from '@/src/lib/auth'
import { err, ok } from '@/src/lib/result'

export const getAuthSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return err(unauthorized('Nao autenticado'))
  return ok(session)
})
