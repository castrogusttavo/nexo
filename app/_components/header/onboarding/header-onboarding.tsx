import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'
import { OnboardingBackButton } from './header-onboarding-back-button'
import { OnboardingProgressBar } from './header-onboarding-progress-bar'
import { OnboardingUserButton } from './header-onboarding-user-button'

// Everything but the avatar is the same for everyone, so it renders at once;
// only the user menu waits for the session. Reading the session here, outside
// a boundary, blocked every navigation between onboarding steps.
export async function HeaderOnboarding() {
  return (
    <div className='w-full flex flex-col gap-4 sticky top-0 z-10'>
      <OnboardingProgressBar />
      <div className='flex items-center justify-between gap-5 w-full px-6'>
        <div className='flex items-center gap-2.5'>
          <OnboardingBackButton />
          <Image
            src='/brand/logo.svg'
            alt='nexo-logo'
            width={100}
            height={45}
            style={{ height: 'auto' }}
            className='invert dark:invert-0'
            priority
          />
        </div>
        <Suspense fallback={<Skeleton className='size-8 rounded-full' />}>
          <HeaderOnboardingUser />
        </Suspense>
      </div>
    </div>
  )
}

async function HeaderOnboardingUser() {
  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

  const profile = await UserService.getProfile(session.value.user.id)
  const { name, email, image } = profile.ok ? profile.value : session.value.user
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <OnboardingUserButton
      name={name ?? null}
      email={email}
      image={image ?? null}
      initials={initials}
    />
  )
}
