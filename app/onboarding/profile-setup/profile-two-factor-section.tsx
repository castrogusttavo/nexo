'use client'

import { useState } from 'react'
import { TwoFactorPasswordForm } from '@/components/security/two-factor-password-form'
import { useTwoFactorPassword } from '@/components/security/use-two-factor-password'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface ProfileTwoFactorSectionProps {
  twoFactorEnabled: boolean
  hasPassword: boolean
}

export function ProfileTwoFactorSection({
  twoFactorEnabled,
  hasPassword,
}: ProfileTwoFactorSectionProps) {
  // Seeded from the server, then owned here: the page props never refresh after a toggle.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [is2FAEnabled, setIs2FAEnabled] = useState(twoFactorEnabled)
  const prompt = useTwoFactorPassword((action) => {
    if (action === 'enable') setIs2FAEnabled(true)
    if (action === 'disable') setIs2FAEnabled(false)
  })

  return (
    <Accordion className='bg-card px-3 py-1 rounded-lg'>
      <AccordionItem value='2fa'>
        <AccordionTrigger className='no-underline hover:no-underline'>
          <div className='flex items-center gap-2'>
            <span>Verificação em duas etapas</span>
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-medium',
                is2FAEnabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {is2FAEnabled ? 'Ativa' : 'Inativa'}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {/* Switch row */}
          <div className='flex items-center justify-between gap-4 pb-3'>
            <p className='text-sm text-muted-foreground m-0!'>
              {!hasPassword
                ? 'Disponível apenas para contas com senha definida.'
                : is2FAEnabled
                  ? 'Código por e-mail a cada login. Para usar um aplicativo autenticador, vá em configurações de segurança.'
                  : 'Recomendada para maior segurança.'}
            </p>
            <Switch
              aria-label='Verificação em duas etapas'
              checked={is2FAEnabled}
              disabled={!hasPassword || prompt.busy || prompt.action !== null}
              onCheckedChange={(next) =>
                prompt.start(next ? 'enable' : 'disable')
              }
            />
          </div>

          <TwoFactorPasswordForm state={prompt} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
