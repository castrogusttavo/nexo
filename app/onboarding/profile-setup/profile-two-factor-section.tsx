'use client'

import { useReducer } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { authClient } from '@/src/lib/auth-client'
import { authErrorMessage } from '@/src/lib/auth-errors'

type TwoFAMode = 'idle' | 'enabling' | 'disabling'

interface TwoFAState {
  isEnabled: boolean
  mode: TwoFAMode
  password: string
  error: string | null
  busy: boolean
}

type TwoFAAction =
  | { type: 'toggleStart'; mode: TwoFAMode }
  | { type: 'passwordChanged'; password: string }
  | { type: 'confirmStart' }
  | { type: 'validationError'; message: string }
  | { type: 'enableSuccess' }
  | { type: 'disableSuccess' }
  | { type: 'requestError'; message: string }
  | { type: 'reset' }

function twoFAReducer(state: TwoFAState, action: TwoFAAction): TwoFAState {
  switch (action.type) {
    case 'toggleStart':
      return {
        ...state,
        error: null,
        password: '',
        mode: action.mode,
      }
    case 'passwordChanged':
      return { ...state, password: action.password }
    case 'confirmStart':
      return { ...state, error: null, busy: true }
    case 'validationError':
      return { ...state, error: action.message }
    case 'enableSuccess':
      return {
        ...state,
        isEnabled: true,
        mode: 'idle',
        password: '',
        busy: false,
      }
    case 'disableSuccess':
      return {
        ...state,
        isEnabled: false,
        mode: 'idle',
        password: '',
        error: null,
        busy: false,
      }
    case 'requestError':
      return { ...state, error: action.message, busy: false }
    case 'reset':
      return { ...state, mode: 'idle', password: '', error: null }
  }
}

interface ProfileTwoFactorSectionProps {
  twoFactorEnabled: boolean
  hasPassword: boolean
}

export function ProfileTwoFactorSection({
  twoFactorEnabled,
  hasPassword,
}: ProfileTwoFactorSectionProps) {
  const [twoFAState, dispatchTwoFA] = useReducer(
    twoFAReducer,
    undefined,
    (): TwoFAState => ({
      isEnabled: twoFactorEnabled,
      mode: 'idle',
      password: '',
      error: null,
      busy: false,
    }),
  )
  const {
    isEnabled: is2FAEnabled,
    mode: twoFAMode,
    password: twoFAPass,
    error: twoFAError,
    busy: twoFABusy,
  } = twoFAState

  function handle2FAToggle(next: boolean) {
    dispatchTwoFA({
      type: 'toggleStart',
      mode: next ? 'enabling' : 'disabling',
    })
  }

  function reset2FA() {
    dispatchTwoFA({ type: 'reset' })
  }

  async function handle2FAConfirm() {
    if (!twoFAPass) {
      dispatchTwoFA({
        type: 'validationError',
        message: 'Informe sua senha para continuar',
      })
      return
    }
    dispatchTwoFA({ type: 'confirmStart' })

    if (twoFAMode === 'enabling') {
      const { error } = await authClient.twoFactor.enable({
        password: twoFAPass,
        method: 'otp',
      })
      if (error) {
        dispatchTwoFA({
          type: 'requestError',
          message: authErrorMessage(error, 'Não foi possível ativar a 2FA'),
        })
        return
      }
      dispatchTwoFA({ type: 'enableSuccess' })
      return
    }

    const { error } = await authClient.twoFactor.disable({
      password: twoFAPass,
    })
    if (error) {
      dispatchTwoFA({
        type: 'requestError',
        message: authErrorMessage(error, 'Não foi possível desativar a 2FA'),
      })
      return
    }
    dispatchTwoFA({ type: 'disableSuccess' })
  }

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
              disabled={!hasPassword || twoFABusy || twoFAMode !== 'idle'}
              onCheckedChange={handle2FAToggle}
            />
          </div>

          {/* Password form */}
          {twoFAMode !== 'idle' && (
            <div className='flex flex-col gap-3 border-t pt-3'>
              <Field data-invalid={!!twoFAError || undefined}>
                <FieldLabel htmlFor='two-factor-password'>
                  Senha para {twoFAMode === 'enabling' ? 'ativar' : 'desativar'}{' '}
                  a 2FA
                </FieldLabel>
                <Input
                  id='two-factor-password'
                  type='password'
                  value={twoFAPass}
                  onChange={(e) =>
                    dispatchTwoFA({
                      type: 'passwordChanged',
                      password: e.target.value,
                    })
                  }
                  placeholder='••••••'
                  disabled={twoFABusy}
                  autoFocus
                />
                {twoFAError && (
                  <p className='text-sm text-destructive' role='alert'>
                    {twoFAError}
                  </p>
                )}
              </Field>
              <div className='flex gap-2 justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={reset2FA}
                  disabled={twoFABusy}
                >
                  Cancelar
                </Button>
                <Button
                  type='button'
                  size='sm'
                  onClick={handle2FAConfirm}
                  disabled={twoFABusy}
                >
                  {twoFABusy
                    ? 'Processando…'
                    : twoFAMode === 'enabling'
                      ? 'Ativar 2FA'
                      : 'Desativar 2FA'}
                </Button>
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
