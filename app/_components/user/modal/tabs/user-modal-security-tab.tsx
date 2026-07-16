'use client'

import { useEffect, useState } from 'react'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { TabsContent } from '@/components/ui/tabs'
import { authClient } from '@/src/lib/auth-client'
import { UserModalSecurityPasswordField } from './user-modal-security-password-field'
import { UserModalSecurityPrivacyField } from './user-modal-security-privacy-field'
import { UserModalSecurityTwoFactorField } from './user-modal-security-two-factor-field'

export function UserModalSecurityTab({ tab }: { tab: string }) {
  const { data: session, isPending } = authClient.useSession()
  const twoFactorEnabled = !!session?.user.twoFactorEnabled

  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    authClient.listAccounts().then(({ data }) => {
      if (!active) return
      setHasPassword(!!data?.some((acc) => acc.providerId === 'credential'))
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <TabsContent value={tab}>
      <div className='flex flex-col gap-7 w-full'>
        <div>
          <H4>Segurança</H4>
          <Muted>
            Gerencie sua senha, verificação em duas etapas e privacidade
          </Muted>
        </div>

        {/* Password — handled by the dedicated /reset-password page */}
        <UserModalSecurityPasswordField
          email={session?.user.email}
          hasPassword={hasPassword}
        />

        {/* 2FA */}
        <UserModalSecurityTwoFactorField
          twoFactorEnabled={twoFactorEnabled}
          isPending={isPending}
          hasPassword={hasPassword}
        />

        {/* Privacy */}
        <UserModalSecurityPrivacyField />
      </div>
    </TabsContent>
  )
}
