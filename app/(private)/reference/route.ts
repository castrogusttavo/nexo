import { ApiReference } from '@scalar/nextjs-api-reference'
import { NextResponse } from 'next/server'
import { NODE_ENV } from '@/lib/env/env'

const config = {
  url: '/openapi.json',
  theme: 'saturn' as const,
}

const handler = ApiReference(config)

export const GET =
  NODE_ENV === 'development'
    ? handler
    : () => NextResponse.json({ message: 'Not found' }, { status: 404 })
