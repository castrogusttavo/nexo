import { sentinelClient } from '@better-auth/infra/client'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    sentinelClient()
  ],
})
