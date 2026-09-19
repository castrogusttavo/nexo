'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldTitle } from '@/components/ui/field'
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
  const descriptionId = useId()

  async function handlePasswordReset() {
    if (!email) return
    setPwBusy(true)

    const promise = authClient
      .requestPasswordReset({ email, redirectTo: '/reset-password' })
      .then(({ error }) => {
        if (error) throw error
      })

    try {
      await notify.mutate(promise, {
        loading: 'Enviando e-mail...',
        success:
          hasPassword === false
            ? 'Enviamos um e-mail para você definir sua senha'
            : 'Enviamos um e-mail para você redefinir sua senha',
        error: 'Não foi possível enviar o e-mail',
      })
    } catch {
      //
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className='flex justify-between items-center gap-3'>
      <Field>
        {/* No input to label here — the action is the button below, which the
            description explains. */}
        <FieldTitle>Senha</FieldTitle>
        <FieldDescription id={descriptionId}>
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
          aria-describedby={descriptionId}
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
