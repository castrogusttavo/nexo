import type { MetadataRoute } from 'next'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { getAllPostsMeta } from '@/src/lib/blog/post'
import { CareerJobService } from '@/src/services/career-job.service'

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]['changeFrequency']
>

interface StaticRoute {
  path: string
  priority: number
  changeFrequency: ChangeFrequency
}

// priority e changeFrequency são ignorados pelo Google (declarado desde
// 2020), mas ainda pesam em outros motores (ex.: Bing) e custam zero —
// mantidos como sinal de intenção. lastModified (abaixo, pros posts e
// vagas) é o único campo que o Google de fato usa.
const STATIC_ROUTES: StaticRoute[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.7, changeFrequency: 'daily' },
  { path: '/careers', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/talk-to-sales', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/docs', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/status', priority: 0.3, changeFrequency: 'daily' },
  { path: '/status/history', priority: 0.2, changeFrequency: 'weekly' },
  { path: '/legals/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/legals/terms', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/legals/security', priority: 0.2, changeFrequency: 'yearly' },
  {
    path: '/legals/trust/access-control',
    priority: 0.2,
    changeFrequency: 'yearly',
  },
  {
    path: '/legals/trust/data-retention',
    priority: 0.2,
    changeFrequency: 'yearly',
  },
  {
    path: '/legals/trust/disaster-recovery',
    priority: 0.2,
    changeFrequency: 'yearly',
  },
  {
    path: '/legals/trust/incident-management',
    priority: 0.2,
    changeFrequency: 'yearly',
  },
  {
    path: '/legals/trust/information-security',
    priority: 0.2,
    changeFrequency: 'yearly',
  },
  {
    path: '/legals/trust/vendor-management',
    priority: 0.2,
    changeFrequency: 'yearly',
  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, careersResult] = await Promise.all([
    getAllPostsMeta(),
    CareerJobService.listPublic(),
  ])
  const careers = careersResult.ok ? careersResult.value : []

  return [
    ...STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
      url: `${NEXT_PUBLIC_URL}${path}`,
      priority,
      changeFrequency,
    })),
    ...posts.map((post) => ({
      url: `${NEXT_PUBLIC_URL}/blog/${post.slug}`,
      lastModified: post.date,
      priority: 0.6,
      changeFrequency: 'monthly' as ChangeFrequency,
    })),
    ...careers.map((job) => ({
      url: `${NEXT_PUBLIC_URL}/careers/${job.slug}`,
      lastModified: job.updatedAt,
      priority: 0.5,
      changeFrequency: 'weekly' as ChangeFrequency,
    })),
  ]
}
