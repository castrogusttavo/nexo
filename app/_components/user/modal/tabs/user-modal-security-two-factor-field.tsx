'use client'

import { useId, useState } from 'react'
import { TwoFactorEnrollment } from '@/components/security/two-factor-enrollment'
import { TwoFactorPasswordForm } from '@/components/security/two-factor-password-form'
import { useTwoFactorPassword } from '@/components/security/use-two-factor-password'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { notify } from '@/lib/notify'
import { authClient } from '@/src/lib/auth-client'

interface UserModalSecurityTwoFactorFieldProps {
  twoFactorEnabled: boolean
  isPending: boolean
  hasPassword: boolean | null
}

export function UserModalSecurityTwoFactorField({
  twoFactorEnabled,
  isPending,
  hasPassword,
}: UserModalSecurityTwoFactorFieldProps) {
  const fieldId = useId()
  const [enrolling, setEnrolling] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const prompt = useTwoFactorPassword((action, data) => {
    // The old codes have been invalidated; show the new set once.
    if (action === 'regenerate')
      setBackupCodes((data as { backupCodes?: string[] })?.backupCodes ?? [])
    if (action === 'disable')
      authClient.getSession({ query: { disableCookieCache: true } })
  })

  function toggleTwoFactor(next: boolean) {
    setBackupCodes(null)
    if (next) setEnrolling(true)
    else prompt.start('disable')
  }

  function startRegenerateBackupCodes() {
    setBackupCodes(null)
    prompt.start('regenerate')
  }

  async function copyBackupCodes() {
    if (!backupCodes) return
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      notify.success('Códigos de backup copiados')
    } catch {
      // ignore
    }
  }

  const idle = !enrolling && prompt.action === null

  return (
    <div className='flex flex-col gap-y-1'>
      <Field orientation='horizontal' className='py-3'>
        <FieldContent>
          <FieldLabel htmlFor={`${fieldId}-switch`}>
            Verificação em duas etapas (2FA)
          </FieldLabel>
          <FieldDescription>
            {hasPassword === false
              ? 'Defina uma senha antes de ativar a verificação em duas etapas.'
              : 'Exija um segundo fator no login: um aplicativo autenticador ou um código de 6 dígitos por e-mail.'}
          </FieldDescription>
        </FieldContent>
        <Switch
          id={`${fieldId}-switch`}
          checked={twoFactorEnabled}
          disabled={isPending || prompt.busy || !idle || hasPassword !== true}
          onCheckedChange={toggleTwoFactor}
        />
      </Field>

      {twoFactorEnabled && idle && (
        <div className='flex justify-end'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={startRegenerateBackupCodes}
          >
            Gerar novos códigos de backup
          </Button>
        </div>
      )}

      {enrolling && (
        <TwoFactorEnrollment
          onEnabled={() => setEnrolling(false)}
          onCancel={() => setEnrolling(false)}
        />
      )}

      <TwoFactorPasswordForm state={prompt} />

      {backupCodes && backupCodes.length > 0 && (
        <div className='flex flex-col gap-3 border-t border-border pt-4'>
          <div>
            <p className='text-sm font-medium'>Códigos de backup</p>
            <Muted>
              Guarde estes códigos em local seguro. Cada um só pode ser usado
              uma vez e não serão exibidos novamente.
            </Muted>
          </div>
          <div className='grid grid-cols-2 gap-2 rounded-md border border-border p-3 font-mono text-sm'>
            {backupCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <div className='flex justify-end'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={copyBackupCodes}
            >
              Copiar códigos
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
