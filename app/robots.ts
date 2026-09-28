import type { MetadataRoute } from 'next'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'

// No '/admin' here on purpose. A Disallow line is a public list of paths:
// it told every crawler, and everyone who reads robots.txt, exactly where the
// platform administration lives — while the app's own answer to a stranger is
// the same 404 a made-up path gets. The gate is the session, the allowlist,
// the verified address and the second factor; the file was only undoing the
// one thing it could not enforce.
const DISALLOWED_PATHS = [
  '/api/',
  '/onboarding',
  '/create-workspace',
  '/upgrade',
]

// Business decision (not just technical): we deliberately allow the AI
// crawlers below. Nexo's public content (blog, pricing, careers) exists
// to be found, and we want a shot at being cited by ChatGPT, Claude,
// Perplexity and AI Overviews — no point blocking the same content we
// optimize for SEO/AEO. Revisit if this stance changes.
const AI_CRAWLER_USER_AGENTS = [
  'GPTBot', // OpenAI / ChatGPT
  'ClaudeBot', // Anthropic / Claude
  'PerplexityBot', // Perplexity
  'Google-Extended', // Gemini / AI Overviews (search Googlebot is always allowed)
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOWED_PATHS,
      })),
    ],
    sitemap: `${NEXT_PUBLIC_URL}/sitemap.xml`,
  }
}
