'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/src/lib/auth-client'

type DeleteState = 'idle' | 'confirming' | 'pending'
type CancelState = 'idle' | 'pending'

interface SettingsDeleteAccountCardProps {
  deletionScheduledAt: string | null
  onCancelled: () => void
}

export function SettingsDeleteAccountCard({
  deletionScheduledAt,
  onCancelled,
}: SettingsDeleteAccountCardProps) {
  const [deleteState, setDeleteState] = useState<DeleteState>('idle')
  const [cancelState, setCancelState] = useState<CancelState>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const scheduledDate = deletionScheduledAt
    ? new Date(deletionScheduledAt).toLocaleString('pt-BR')
    : null

  async function handleDeleteAccount() {
    setDeleteError(null)
    setDeleteState('pending')
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setDeleteError(
          json?.error?.message ?? 'Não foi possível agendar a exclusão',
        )
        setDeleteState('confirming')
        return
      }
      // DB sessions are revoked server-side, but better-auth's cookie
      // cache (5min) would keep this tab "logged in". Sign out on the
      // client to drop the cookie immediately.
      await authClient.signOut()
      window.location.href = '/'
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erro de rede')
      setDeleteState('confirming')
    }
  }

  async function handleCancelDeletion() {
    setDeleteError(null)
    setCancelState('pending')
    try {
      const res = await fetch('/api/users/me/deletion', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setDeleteError(
          json?.error?.message ?? 'Não foi possível cancelar a exclusão',
        )
        setCancelState('idle')
        return
      }
      onCancelled()
      setCancelState('idle')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erro de rede')
      setCancelState('idle')
    }
  }

  return (
    <Card className='border-destructive/40'>
      <CardHeader>
        <CardTitle className='text-destructive'>Excluir conta</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {scheduledDate ? (
          <div className='space-y-3'>
            <p className='text-sm'>
              Exclusão agendada para{' '}
              <span className='font-medium'>{scheduledDate}</span>. Você pode
              cancelar a qualquer momento antes dessa data.
            </p>
            {deleteError && (
              <p className='text-sm text-destructive'>{deleteError}</p>
            )}
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={handleCancelDeletion}
                disabled={cancelState === 'pending'}
              >
                {cancelState === 'pending'
                  ? 'Cancelando...'
                  : 'Cancelar exclusão'}
              </Button>
            </div>
          </div>
        ) : (
          <div className='space-y-3'>
            <p className='text-sm text-muted-foreground'>
              A conta será agendada para exclusão. Suas sessões serão encerradas
              e você precisará entrar novamente para cancelar.
            </p>
            {deleteError && (
              <p className='text-sm text-destructive'>{deleteError}</p>
            )}
            {deleteState === 'idle' && (
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='destructive'
                  onClick={() => setDeleteState('confirming')}
                >
                  Excluir conta
                </Button>
              </div>
            )}
            {deleteState !== 'idle' && (
              <div className='flex justify-end gap-2'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => {
                    setDeleteState('idle')
                    setDeleteError(null)
                  }}
                  disabled={deleteState === 'pending'}
                >
                  Cancelar
                </Button>
                <Button
                  type='button'
                  variant='destructive'
                  onClick={handleDeleteAccount}
                  disabled={deleteState === 'pending'}
                >
                  {deleteState === 'pending'
                    ? 'Agendando...'
                    : 'Confirmar exclusão'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
