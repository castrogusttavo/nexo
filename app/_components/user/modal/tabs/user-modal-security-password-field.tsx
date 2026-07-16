'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { notify } from '@/lib/notify'
import { authClient } from '@/src/lib/auth-client'

interface UserModalSecurityPasswordFieldProps {
  email: string | undefined
  hasPassword: boolean | null
}

export function UserModalSecurityPasswordField({
  email,
  hasPassword,
}: UserModalSecurityPasswordFieldProps) {
  const [pwBusy, setPwBusy] = useState(false)

  async function handlePasswordReset() {
    if (!email) return
    setPwBusy(true)
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })
    setPwBusy(false)
    if (error) {
      notify.error(error.message ?? 'Não foi possível enviar o e-mail')
      return
    }
    notify.success(
      hasPassword === false
        ? 'Enviamos um e-mail para você definir sua senha'
        : 'Enviamos um e-mail para você redefinir sua senha',
    )
  }

  return (
    <div className='flex justify-between items-center gap-3'>
      <Field>
        <FieldLabel>Senha</FieldLabel>
        <FieldDescription>
          {hasPassword === false
            ? 'Sua conta foi criada com login social e ainda não tem senha. Enviaremos um e-mail com um link para você definir uma.'
            : 'Enviaremos um e-mail com um link seguro para redefinir sua senha. Por segurança, isso encerra suas sessões e exige um novo login.'}
        </FieldDescription>
      </Field>
      <div className='flex justify-end'>
        <Button
          type='button'
          onClick={handlePasswordReset}
          disabled={pwBusy}
          size='sm'
        >
          {pwBusy
            ? 'Enviando...'
            : hasPassword === false
              ? 'Definir senha'
              : 'Redefinir senha'}
        </Button>
      </div>
    </div>
  )
}
