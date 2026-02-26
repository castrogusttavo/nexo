import { authClient } from '@/src/lib/auth-client'
import Image from 'next/image'
import { Button } from './ui/button'
import { LoginButtonProps } from './types/login-button'

export function GoogleLoginButton({ isPending }: LoginButtonProps) {
  async function handleSocialSignIn(provider: 'google' | 'github') {
    await authClient.signIn.social({ provider, callbackURL: '/' })
  }

  return (
    <Button
      type='button'
      variant='outline'
      className='w-full'
      onClick={() => handleSocialSignIn('google')}
      disabled={isPending}
    >
      <Image alt="google-logo" src="https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1755835725776" width={14} height={14} />
      Continuar com Google
    </Button>
  )
}
