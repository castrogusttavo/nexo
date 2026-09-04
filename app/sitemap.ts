import type { MetadataRoute } from 'next'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { getAllPostsMeta } from '@/src/lib/blog/post'
import { CareerJobService } from '@/src/services/career-job.service'

const STATIC_ROUTES = [
  '/',
  '/pricing',
  '/blog',
  '/careers',
  '/talk-to-sales',
  '/docs',
  '/status',
  '/status/history',
  '/legals/privacy',
  '/legals/terms',
  '/legals/security',
  '/legals/trust/access-control',
  '/legals/trust/data-retention',
  '/legals/trust/disaster-recovery',
  '/legals/trust/incident-management',
  '/legals/trust/information-security',
  '/legals/trust/vendor-management',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, careersResult] = await Promise.all([
    getAllPostsMeta(),
    CareerJobService.listPublic(),
  ])
  const careers = careersResult.ok ? careersResult.value : []

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${NEXT_PUBLIC_URL}${route}`,
    })),
    ...posts.map((post) => ({
      url: `${NEXT_PUBLIC_URL}/blog/${post.slug}`,
      lastModified: post.date,
    })),
    ...careers.map((job) => ({
      url: `${NEXT_PUBLIC_URL}/careers/${job.slug}`,
      lastModified: job.updatedAt,
    })),
  ]
}
