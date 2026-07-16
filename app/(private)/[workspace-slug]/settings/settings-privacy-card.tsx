'use client'

import { useCookieConsent } from '@/app/_components/user/cookie-consent/provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

interface SettingsPrivacyCardProps {
  acceptedTermsAt: string | null
  acceptedPrivacyAt: string | null
}

export function SettingsPrivacyCard({
  acceptedTermsAt,
  acceptedPrivacyAt,
}: SettingsPrivacyCardProps) {
  const { consent: cookieConsent, setConsent: setCookieConsent } =
    useCookieConsent()
  const cookiesAccepted = cookieConsent === 'accepted'

  const termsDate = acceptedTermsAt
    ? new Date(acceptedTermsAt).toLocaleDateString('pt-BR')
    : null
  const privacyDate = acceptedPrivacyAt
    ? new Date(acceptedPrivacyAt).toLocaleDateString('pt-BR')
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacidade</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='space-y-1'>
            <p className='text-sm font-medium'>Cookies de análise</p>
            <p className='text-sm text-muted-foreground'>
              {cookieConsent === null
                ? 'Você ainda não decidiu sobre o uso de cookies de análise.'
                : cookiesAccepted
                  ? 'Aceitos. Você pode revogar a qualquer momento.'
                  : 'Recusados. Nenhum tracker de análise é carregado.'}
            </p>
          </div>
          <Switch
            checked={cookiesAccepted}
            onCheckedChange={(next) =>
              setCookieConsent(next ? 'accepted' : 'rejected')
            }
          />
        </div>

        <div className='border-t pt-4 space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>Termos de Serviço</span>
            <span>
              {termsDate ? `Aceito em ${termsDate}` : 'Pendente de aceite'}
            </span>
          </div>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>
              Política de Privacidade
            </span>
            <span>
              {privacyDate ? `Aceita em ${privacyDate}` : 'Pendente de aceite'}
            </span>
          </div>
          <p className='text-sm text-muted-foreground pt-2'>
            Para revogar o aceite dos Termos ou da Política de Privacidade, você
            precisa excluir sua conta: não é possível manter a conta ativa sem
            esses aceites.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
