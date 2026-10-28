import type { ReactNode } from 'react'
import { HeaderLogin } from '@/components/header-login'
import { SocialLoginButtonProps } from '@/components/social-login-button'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'

// The frame of every sign-in, sign-up and password page: the logo with the
// link to the other side, a narrow centred column and the closing line.
export function AuthLayout({
  switchHref,
  switchLabel,
  switchPrompt,
  children,
}: {
  /** Where the header link goes, e.g. /sign-up from the sign-in page. */
  switchHref: string
  switchLabel: string
  switchPrompt?: string
  children: ReactNode
}) {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 pb-12'>
      <HeaderLogin
        path={switchHref}
        pathname={switchLabel}
        prompt={switchPrompt}
      />
      <div className='flex-1 w-full flex flex-col justify-center gap-y-6 max-w-90'>
        {children}
      </div>
      <div>
        <Muted>Junte-se a mais de 1.000 times no Nexo</Muted>
      </div>
    </div>
  )
}

// The two-line heading each step opens with: what this is, then what to do.
export function AuthLayoutHeading({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div>
      <H4>{title}</H4>
      <H4 className='text-muted-foreground'>{subtitle}</H4>
    </div>
  )
}

// Google and GitHub, then the "ou" rule above the e-mail form.
export function AuthLayoutSocial({
  isPending,
  callbackURL,
}: {
  isPending: boolean
  callbackURL: string
}) {
  return (
    <>
      <div className='flex flex-col gap-3'>
        <SocialLoginButtonProps
          provider='google'
          isPending={isPending}
          callbackURL={callbackURL}
        />
        <SocialLoginButtonProps
          provider='github'
          isPending={isPending}
          callbackURL={callbackURL}
        />
      </div>
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-background px-2 text-muted-foreground'>ou</span>
        </div>
      </div>
    </>
  )
}
