'use client'

import { ThreeDScaleIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { authClient } from '@/src/lib/auth-client'
import { NexoIcon } from './_components/icon/icon'

export default function RootPage() {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/sign-in')
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen gap-4'>
      <h1>Hello world!</h1>
      <Button variant='outline' onClick={handleSignOut}>
        <NexoIcon icon={ThreeDScaleIcon} />
        Sair
      </Button>
    </div>
  )
}
