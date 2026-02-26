import { authClient } from '@/src/lib/auth-client'
import Image from 'next/image'
import { Button } from './ui/button'
import { LoginButtonProps } from './types/login-button'

export function GitHubLoginButton({ isPending }: LoginButtonProps) {
  async function handleSocialSignIn(provider: 'google' | 'github') {
    await authClient.signIn.social({ provider, callbackURL: '/' })
  }

  return (
    <Button
      type='button'
      variant='outline'
      className='w-full'
      onClick={() => handleSocialSignIn('github')}
      disabled={isPending}
    >
      <Image alt="github-logo" src="https://cdn.brandfetch.io/idZAyF9rlg/theme/light/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1719469980826" width={14} height={14} />
      Continuar com GitHub
    </Button>
  )
}
