import type { MetadataRoute } from 'next'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/onboarding',
        '/admin',
        '/create-workspace',
        '/upgrade',
      ],
    },
    sitemap: `${NEXT_PUBLIC_URL}/sitemap.xml`,
  }
}
