import { authClient } from "@/src/lib/auth-client";
import { Button } from "./ui/button";
import Image from "next/image";

type SocialProvider = 'google' | 'github'

const PROVIDERS: Record<
  SocialProvider,
  { label: string; logoSrc: string; logoClassName?: string }
> = {
  google: {
    label: 'Continuar com Google',
    logoSrc: 'https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1755835725776',
  },
  github: {
    label: 'Continuar com GitHub',
    logoSrc: 'https://cdn.brandfetch.io/idZAyF9rlg/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1719469980826',
    // The mark is black: flip it or it disappears on the dark theme
    logoClassName: 'dark:invert',
  },
}

interface SocialLoginButtonProps {
  provider: SocialProvider
  isPending: boolean
  callbackURL?: string
}

export function SocialLoginButtonProps({
  provider,
  isPending,
  callbackURL = '/'
}: SocialLoginButtonProps) {
  const { label, logoSrc, logoClassName } = PROVIDERS[provider]

  async function handleSocialSignIn() {
    await authClient.signIn.social({
      provider,
      callbackURL
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
      <Image alt='' src={logoSrc} width={14} height={14} className={logoClassName} />
      {label}
    </Button>
  )
}
