import type { Metadata } from 'next'
import { getAllPostsMeta } from '@/src/lib/blog/post'
import { BlogFeatured } from './blog-featured'
import { BlogList } from './blog-list'

const TITLE = 'Blog | Nexo'
const DESCRIPTION = 'Novidades, bastidores e aprendizados do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: '/blog',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default async function BlogPage() {
  const posts = await getAllPostsMeta()
  const [featured, ...rest] = posts
  const highlighted = rest.slice(0, 3)

  return (
    <main className='mx-auto w-full flex flex-col items-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10'>
      {featured && (
        <BlogFeatured featured={featured} highlighted={highlighted} />
      )}
      <BlogList posts={posts} />
    </main>
  )
}
