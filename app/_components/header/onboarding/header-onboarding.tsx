import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { OnboardingBackButton } from './header-onboarding-back-button'
import { OnboardingProgressBar } from './header-onboarding-progress-bar'
import { OnboardingUserButton } from './header-onboarding-user-button'

export async function HeaderOnboarding() {
  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

  const { name, email, image } = session.value.user
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

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
            priority
          />
        </div>
        <OnboardingUserButton
          name={name ?? null}
          email={email}
          image={image ?? null}
          initials={initials}
        />
      </div>
    </div>
  )
}
