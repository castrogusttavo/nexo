'use client'

import { ArrowLeft01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { HugeiconsIcon } from '@hugeicons/react'
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp'
import { useEffect, useRef, useState } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'

const RESEND_COOLDOWN_SECONDS = 30

interface EmailValidationWithOtpProps {
  email: string
  onBack: () => void
  onVerify: (otp: string) => Promise<void> | void
  onResend: () => Promise<void> | void
  isPending?: boolean
  error?: string | null
  onUseBackupCode?: () => void
}

export function EmailValidationWithOtp({
  email,
  onBack,
  onVerify,
  onResend,
  isPending,
  error,
  onUseBackupCode
}: EmailValidationWithOtpProps) {
  const [otp, setOtp] = useState('')
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [isResending, setIsResending] = useState(false)
  const lastSubmittedRef = useRef<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  useEffect(() => {
    if (error) {
      setOtp('')
      lastSubmittedRef.current = null
    }
  }, [error])

  function handleOtpChange(value: string) {
    setOtp(value)
    if (value.length !== 6) return
    if (lastSubmittedRef.current === value) return
    if (isPending) return
    lastSubmittedRef.current = value
    void onVerify(value)
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return
    setIsResending(true)
    try {
      await onResend()
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setOtp('')
      lastSubmittedRef.current = null
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className='w-full space-y-5'>
      <button
        type='button'
        onClick={onBack}
        className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className='size-4' />
        Voltar
      </button>

      <div className='space-y-1'>
        <p className='text-sm font-medium'>Confirme seu e-mail</p>
        <Muted className='text-sm'>
          Enviamos um código de 6 dígitos para <span className='text-foreground'>{email}</span>. Ele expira em 5 minutos.
        </Muted>
      </div>

      {error && (
        <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
          {error}
        </div>
      )}

      <div className='flex justify-center'>
        <InputOTP
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
          value={otp}
          onChange={handleOtpChange}
          disabled={isPending}
          autoFocus
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className='flex items-center justify-center'>
        <Button
          type='button'
          variant='link'
          size='sm'
          onClick={handleResend}
          disabled={cooldown > 0 || isResending || isPending}
        >
          {cooldown > 0
            ? `Reenviar código em ${cooldown}s`
            : isResending
              ? 'Reenviando...'
              : 'Reenviar código'}
        </Button>
        {onUseBackupCode && (
          <button
            type='button'
            onClick={onUseBackupCode}
            className='text-sm text-primary hover:underline'
          >
            Não consegue acessar o e-mail? Usar um código de backup
          </button>
        )}
      </div>
    </div>
  )
}
