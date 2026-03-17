import { ApiReference } from '@scalar/nextjs-api-reference'
import { NextResponse } from 'next/server'

const config = {
  url: '/openapi.json',
  theme: 'saturn' as const,
}

const handler = ApiReference(config)

export const GET =
  process.env.NODE_ENV === 'development'
    ? handler
    : () => NextResponse.json({ message: 'Not found' }, { status: 404 })
