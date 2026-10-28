import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { authClient } from '@/src/lib/auth-client'

type SocialProvider = 'google' | 'github'

const PROVIDERS: Record<
  SocialProvider,
  { label: string; logoSrc: string; logoClassName?: string }
> = {
  google: {
    label: 'Continuar com Google',
    logoSrc:
      'https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1755835725776',
  },
  github: {
    label: 'Continuar com GitHub',
    logoSrc:
      'https://cdn.brandfetch.io/idZAyF9rlg/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1719469980826',
    // The mark is black: flip it or it disappears on the dark theme
    logoClassName: 'dark:invert',
  },
}

interface AuthSocialButtonProps {
  provider: SocialProvider
  isPending: boolean
  callbackURL?: string
}

export function AuthSocialButton({
  provider,
  isPending,
  callbackURL = '/',
}: AuthSocialButtonProps) {
  const { label, logoSrc, logoClassName } = PROVIDERS[provider]

  async function handleSocialSignIn() {
    await authClient.signIn.social({
      provider,
      callbackURL,
    })
  }

  return (
    <Button
      type='button'
      variant='outline'
      className='w-full'
      onClick={handleSocialSignIn}
      disabled={isPending}
    >
      {/* Decorative: the label already names the provider. An alt text here
          became part of the button's accessible name, so screen readers
          announced "google-logo Continuar com Google". */}
      <Image
        alt=''
        src={logoSrc}
        width={14}
        height={14}
        className={logoClassName}
      />
      {label}
    </Button>
  )
}
