import { ApiReference } from '@scalar/nextjs-api-reference'

const config = {
  url: '/openapi.json',
  theme: 'saturn' as const,
}
export const GET = ApiReference(config)
