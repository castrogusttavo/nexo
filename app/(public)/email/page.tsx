'use client'

import { useState } from 'react'
import { sendInactiveUserEmail } from '@/src/lib/mail/behavior/send-inactive-user'
import { sendInactiveWorkItemEmail } from '@/src/lib/mail/behavior/send-inactive-work-item'
import { sendInactiveWorkspaceEmail } from '@/src/lib/mail/behavior/send-inactive-workspace'
import { sendPostMortemEmail } from '@/src/lib/mail/send-post-mortem'
import { sendDeleteAccountEmail } from '@/src/lib/mail/user/send-delete-account'
import { sendExportDataEmail } from '@/src/lib/mail/user/send-export-data'
import { sendResetPasswordEmail } from '@/src/lib/mail/user/send-reset-password'
import { sendVerifyEmailWithOtpEmail } from '@/src/lib/mail/user/send-verify-email-with-otp'
import { sendWelcomeEmail } from '@/src/lib/mail/user/send-welcome'
import { sendInviteUserToWorkspaceEmail } from '@/src/lib/mail/workspace/send-invite-user-to-workspace'
import { sendTrialEndPromotionEmail } from '@/src/lib/mail/workspace/send-trial-end-promotion'

type Status = 'idle' | 'loading' | 'success' | 'error'

const TEST_EMAIL = 'castrogusttavo.dev@gmail.com'
const TEST_USERNAME = 'Gusttavo Castro'

export default function EmailPage() {
  const [welcomeStatus, setWelcomeStatus] = useState<Status>('idle')
  const [resetStatus, setResetStatus] = useState<Status>('idle')
  const [otpStatus, setOtpStatus] = useState<Status>('idle')
  const [inviteStatus, setInviteStatus] = useState<Status>('idle')
  const [trialEndStatus, setTrialEndStatus] = useState<Status>('idle')
  const [postMortemStatus, setPostMortemStatus] = useState<Status>('idle')
  const [inactiveWorkspaceStatus, setInactiveWorkspaceStatus] =
    useState<Status>('idle')
  const [inactiveWorkItemStatus, setInactiveWorkItemStatus] =
    useState<Status>('idle')
  const [inactiveUserStatus, setInactiveUserStatus] = useState<Status>('idle')
  const [deleteAccountStatus, setDeleteAccountStatus] = useState<Status>('idle')
  const [exportDataStatus, setExportDataStatus] = useState<Status>('idle')

  async function handleWelcome() {
    setWelcomeStatus('loading')

    try {
      await sendWelcomeEmail({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        trialDays: '14',
      })
      setWelcomeStatus('success')
    } catch {
      setWelcomeStatus('error')
    }
  }

  async function handleResetPassword() {
    setResetStatus('loading')

    try {
      await sendResetPasswordEmail({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        redirectUrl: 'https://nexo.coodee.dev/reset-password',
      })
      setResetStatus('success')
    } catch {
      setResetStatus('error')
    }
  }

  async function handleVerifyEmailOtp() {
    setOtpStatus('loading')

    try {
      await sendVerifyEmailWithOtpEmail({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        validationCode: 'ABC-XYZ',
      })
      setOtpStatus('success')
    } catch {
      setOtpStatus('error')
    }
  }

  async function handleInviteUser() {
    setInviteStatus('loading')

    try {
      await sendInviteUserToWorkspaceEmail({
        email: TEST_EMAIL,
        redirectUrl: 'https://nexo.coodee.dev/invite',
        inviterName: 'Fulano da Silva',
        inviterEmail: 'fulano@coodee.dev',
        workspaceName: 'Coodee',
      })
      setInviteStatus('success')
    } catch {
      setInviteStatus('error')
    }
  }

  async function handleTrialEndPromotion() {
    setTrialEndStatus('loading')

    try {
      await sendTrialEndPromotionEmail({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        workspaceName: 'Coodee',
        trialEndDate: '08/05',
        daysRemaining: '3',
        couponCode: 'NEXO20',
        discountLabel: '20% off no primeiro ano',
        itemsCreated: 12,
      })
      setTrialEndStatus('success')
    } catch {
      setTrialEndStatus('error')
    }
  }

  async function handlePostMortem() {
    setPostMortemStatus('loading')

    try {
      await sendPostMortemEmail({
        email: TEST_EMAIL,
        incidentTitle: 'Indisponibilidade do editor de tasks',
        incidentDate: '26/04/2026',
        incidentId: 'INC-0042',
        resume: [
          'Entre 14:32 e 16:19, o editor de tasks ficou indisponível para parte dos workspaces, impedindo a criação e edição de tarefas.',
          'Identificamos que um deploy com migração inconsistente causou o problema. Revertimos a alteração e o funcionamento foi totalmente restaurado.',
          'Ajustamos nosso processo de deploy e validação para evitar esse tipo de inconsistência nas próximas atualizações.',
        ],
      })
      setPostMortemStatus('success')
    } catch {
      setPostMortemStatus('error')
    }
  }

  async function handleInactiveWorkspace() {
    setInactiveWorkspaceStatus('loading')

    try {
      await sendInactiveWorkspaceEmail({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        redirectUrl: 'https://nexo.coodee.dev',
      })
      setInactiveWorkspaceStatus('success')
    } catch {
      setInactiveWorkspaceStatus('error')
    }
  }

  async function handleInactiveWorkItem() {
    setInactiveWorkItemStatus('loading')

    try {
      await sendInactiveWorkItemEmail({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        redirectUrl: 'https://nexo.coodee.dev',
      })
      setInactiveWorkItemStatus('success')
    } catch {
      setInactiveWorkItemStatus('error')
    }
  }

  async function handleInactiveUser() {
    setInactiveUserStatus('loading')

    try {
      await sendInactiveUserEmail({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        redirectUrl: 'https://nexo.coodee.dev',
      })
      setInactiveUserStatus('success')
    } catch {
      setInactiveUserStatus('error')
    }
  }

  async function handleDeleteAccount() {
    setDeleteAccountStatus('loading')

    try {
      await sendDeleteAccountEmail({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        scheduledDeletionDate: '26/05/2026',
        redirectUrl: 'https://nexo.coodee.dev/account/cancel-deletion',
      })
      setDeleteAccountStatus('success')
    } catch {
      setDeleteAccountStatus('error')
    }
  }

  async function handleExportData() {
    setExportDataStatus('loading')

    try {
      await sendExportDataEmail({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        downloadUrl: 'https://nexo.coodee.dev/exports/abc123.zip',
        expiresAt: '03/05/2026',
        fileSize: '242 MB',
      })
      setExportDataStatus('success')
    } catch {
      setExportDataStatus('error')
    }
  }

  function label(base: string, status: Status) {
    if (status === 'loading') return 'Enviando...'
    if (status === 'success') return '✓ Email enviado'
    if (status === 'error') return '✗ Erro ao enviar'
    return base
  }

  return (
    <div className='flex flex-col gap-3 p-6'>
      <button
        onClick={handleWelcome}
        disabled={welcomeStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar welcome', welcomeStatus)}
      </button>
      <button
        onClick={handleResetPassword}
        disabled={resetStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar reset password', resetStatus)}
      </button>
      <button
        onClick={handleVerifyEmailOtp}
        disabled={otpStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar verify email OTP', otpStatus)}
      </button>
      <button
        onClick={handleInviteUser}
        disabled={inviteStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar invite user', inviteStatus)}
      </button>
      <button
        onClick={handleTrialEndPromotion}
        disabled={trialEndStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar trial end promotion', trialEndStatus)}
      </button>
      <button
        onClick={handlePostMortem}
        disabled={postMortemStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar post mortem', postMortemStatus)}
      </button>
      <button
        onClick={handleInactiveWorkspace}
        disabled={inactiveWorkspaceStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar inactive workspace', inactiveWorkspaceStatus)}
      </button>
      <button
        onClick={handleInactiveWorkItem}
        disabled={inactiveWorkItemStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar inactive work item', inactiveWorkItemStatus)}
      </button>
      <button
        onClick={handleInactiveUser}
        disabled={inactiveUserStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar inactive user', inactiveUserStatus)}
      </button>
      <button
        onClick={handleDeleteAccount}
        disabled={deleteAccountStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar delete account', deleteAccountStatus)}
      </button>
      <button
        onClick={handleExportData}
        disabled={exportDataStatus === 'loading'}
        className='rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50'
      >
        {label('Enviar export data', exportDataStatus)}
      </button>
    </div>
  )
}
