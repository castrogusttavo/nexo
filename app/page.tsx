'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { authClient } from '@/src/lib/auth-client'

export default function App() {
  const router = useRouter()

  useEffect(() => {
    async function handleSignOut() {
      await authClient.signOut()
      router.push('/sign-in')
    }

    handleSignOut()
  }, [router])

  return null
}
