'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { type AcceptConsentState, acceptOnboardingConsent } from './actions'

const INITIAL_STATE: AcceptConsentState = { ok: false }

export function ConsentForm() {
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [state, formAction, isPending] = useActionState(
    acceptOnboardingConsent,
    INITIAL_STATE,
  )

  const bothChecked = acceptedTerms && acceptedPrivacy

  return (
    <form action={formAction} className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3'>
        <Field orientation='horizontal'>
          <Checkbox
            id='accept-terms'
            name='acceptedTerms'
            checked={acceptedTerms}
            onCheckedChange={(s) => setAcceptedTerms(s === true)}
            disabled={isPending}
          />
          <FieldLabel
            htmlFor='accept-terms'
            className='text-sm leading-5 text-muted-foreground'
          >
            Li e aceito os{' '}
            <Link
              href='/legals/terms'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              Termos de Serviço
            </Link>
          </FieldLabel>
        </Field>

        <Field orientation='horizontal'>
          <Checkbox
            id='accept-privacy'
            name='acceptedPrivacy'
            checked={acceptedPrivacy}
            onCheckedChange={(s) => setAcceptedPrivacy(s === true)}
            disabled={isPending}
          />
          <FieldLabel
            htmlFor='accept-privacy'
            className='text-sm leading-5 text-muted-foreground'
          >
            Li e aceito os{' '}
            <Link
              href='/legals/privacy'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              Política de Privacidade
            </Link>
          </FieldLabel>
        </Field>
      </div>

      {state.error && (
        <p className='text-sm text-destructive' role='alert'>
          {state.error}
        </p>
      )}

      <Button
        type='submit'
        className='w-full'
        disabled={!bothChecked || isPending}
      >
        {isPending ? 'Salvando...' : 'Continuar'}
      </Button>
    </form>
  )
}
