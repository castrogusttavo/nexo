'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAcceptInvitation } from '@/src/hooks/use-invitation'

export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter()
  const { mutate, status, error } = useAcceptInvitation()

  useEffect(() => {
    mutate(token, {
      onSuccess: ({ slug }) => router.replace(`/${slug}`),
    })
  }, [token, mutate, router])

  if (status === 'pending') return <p>Validando convite…</p>

  if (status === 'error') {
    return (
      <div>
        <h1>Não foi possível aceitar o convite</h1>
        <p>{error instanceof Error ? error.message : 'Tente novamente.'}</p>
      </div>
    )
  }

  return <p>Convite aceito! Redirecionando…</p>
}
