'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCookieConsent } from './provider'

export function CookieConsentBanner() {
  const { consent, setConsent } = useCookieConsent()

  if (consent !== null) return null

  return (
    <section
      aria-label='Aviso de cookies'
      className='fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border bg-background p-4 shadow-lg md:flex-row md:items-center md:justify-between'
    >
      <p className='text-sm text-muted-foreground'>
        Usamos cookies de análise para entender como o Nexo é usado e melhorar o
        produto. Você pode revogar a qualquer momento nas configurações.{' '}
        <Link
          href='/legals/privacy#cookies'
          className='text-primary hover:underline'
          target='_blank'
          rel='noopener noreferrer'
        >
          Saiba mais
        </Link>
      </p>
      <div className='flex flex-shrink-0 gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => setConsent('rejected')}
        >
          Rejeitar
        </Button>
        <Button type='button' size='sm' onClick={() => setConsent('accepted')}>
          Aceitar
        </Button>
      </div>
    </section>
  )
}
