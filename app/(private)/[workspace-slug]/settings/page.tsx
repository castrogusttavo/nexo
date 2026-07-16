'use client'

import { useCallback, useEffect, useState } from 'react'
import { SettingsDeleteAccountCard } from './settings-delete-account-card'
import { SettingsPrivacyCard } from './settings-privacy-card'
import { SettingsTwoFactorCard } from './settings-two-factor-card'

interface ProfileResponse {
  success: boolean
  data: {
    deletionScheduledAt: string | null
    acceptedTermsAt: string | null
    acceptedPrivacyAt: string | null
  }
}

export default function SettingsPage() {
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(
    null,
  )
  const [acceptedTermsAt, setAcceptedTermsAt] = useState<string | null>(null)
  const [acceptedPrivacyAt, setAcceptedPrivacyAt] = useState<string | null>(
    null,
  )

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { cache: 'no-store' })
      if (!res.ok) return
      const json: ProfileResponse = await res.json()
      setDeletionScheduledAt(json.data.deletionScheduledAt)
      setAcceptedTermsAt(json.data.acceptedTermsAt)
      setAcceptedPrivacyAt(json.data.acceptedPrivacyAt)
    } catch {
      // ignore — UI just won't update; user can refresh
    }
  }, [])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  return (
    <div className='flex-1 p-6 max-w-3xl mx-auto w-full space-y-6'>
      <SettingsTwoFactorCard />
      <SettingsPrivacyCard
        acceptedTermsAt={acceptedTermsAt}
        acceptedPrivacyAt={acceptedPrivacyAt}
      />
      <SettingsDeleteAccountCard
        deletionScheduledAt={deletionScheduledAt}
        onCancelled={() => setDeletionScheduledAt(null)}
      />
    </div>
  )
}
