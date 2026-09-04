import type { MetadataRoute } from 'next'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'

const DISALLOWED_PATHS = [
  '/api/',
  '/onboarding',
  '/admin',
  '/create-workspace',
  '/upgrade',
]

// Decisão de negócio (não só técnica): liberamos deliberadamente os
// crawlers de IA abaixo. O conteúdo público do Nexo (blog, pricing,
// carreiras) existe pra ser encontrado, e queremos chance de ser citado
// por ChatGPT, Claude, Perplexity e AI Overviews — não faz sentido
// bloquear o mesmo conteúdo que otimizamos pra SEO/AEO. Revisitar se
// essa postura mudar.
const AI_CRAWLER_USER_AGENTS = [
  'GPTBot', // OpenAI / ChatGPT
  'ClaudeBot', // Anthropic / Claude
  'PerplexityBot', // Perplexity
  'Google-Extended', // Gemini / AI Overviews (Googlebot de busca é sempre liberado)
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
