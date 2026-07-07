import { authClient } from "@/src/lib/auth-client";
import { Button } from "./ui/button";
import Image from "next/image";

type SocialProvider = 'google' | 'github'

const PROVIDERS: Record<
  SocialProvider,
  { label: string; logoAlt: string; logoSrc: string }
> = {
  google: {
    label: 'Continuar com Google',
    logoAlt: 'google-logo',
    logoSrc: 'https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1755835725776',
  },
  github: {
    label: 'Continuar com GitHub',
    logoAlt: 'github-logo',
    logoSrc: 'https://cdn.brandfetch.io/idZAyF9rlg/theme/light/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1719469980826',
  }
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
  const { label, logoAlt, logoSrc } = PROVIDERS[provider]

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
      <Image alt={logoAlt} src={logoSrc} width={14} height={14} />
      {label}
    </Button>
  )
}
