'use client'

import { useId } from 'react'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { useCookieConsent } from '../../cookie-consent/provider'

export function UserModalSecurityPrivacyField() {
  const { consent, setConsent } = useCookieConsent()
  const cookiesAccepted = consent === 'accepted'
  const switchId = useId()

  return (
    <div>
      <Field orientation='horizontal' className='py-3'>
        <FieldContent>
          <FieldLabel htmlFor={switchId}>Cookies de análise</FieldLabel>
          <FieldDescription>
            {consent === null
              ? 'Você ainda não decidiu sobre o uso de cookies de análise.'
              : cookiesAccepted
                ? 'Aceitos. Você pode revogar a qualquer momento.'
                : 'Recusados. Nenhum tracker de análise é carregado.'}
          </FieldDescription>
        </FieldContent>
        <Switch
          id={switchId}
          checked={cookiesAccepted}
          onCheckedChange={(next) => setConsent(next ? 'accepted' : 'rejected')}
        />
      </Field>
    </div>
  )
}
