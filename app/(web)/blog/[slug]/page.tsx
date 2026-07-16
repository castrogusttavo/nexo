import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { BLOG_POST_TAG_LABELS } from '@/src/lib/blog/blog-labels'
import { formatPostDate } from '@/src/lib/blog/format-ṕost-date'
import { getAllPostsMeta, getPostBySlug } from '@/src/lib/blog/post'
import { BlogContent } from './blog-content'
import { CopyMarkdownButton } from './copy-markdown-button'
import { TableOfContents } from './table-of-contents'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllPostsMeta()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  return (
    <main className='mx-auto w-full flex flex-col px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10'>
      <div className='w-full flex flex-col gap-10 xl:max-w-[80%] mx-auto py-16'>
        <div className='w-full flex flex-col gap-4 pb-2'>
          <Muted className='text-priary'>
            <Link href='/blog' className='text-muted-foreground'>
              Blog /
            </Link>{' '}
            {BLOG_POST_TAG_LABELS[post.tag]}
          </Muted>

          <div className='space-y-4'>
            <h1 className='text-4xl font-normal'>{post.title}</h1>
            <Muted className='text-lg font-normal'>{post.excerpt}</Muted>
            <Muted className='font-light'>
              Gusttavo Castro · {formatPostDate(post.date)}
            </Muted>
          </div>

          <Image
            src={post.cover || ''}
            alt={post.slug}
            width={1080}
            height={720}
            className='rounded-4xl w-full object-cover'
          />
        </div>
        <div className='w-full flex justify-between'>
          <div className='space-y-6 w-full lg:sticky top-24 h-fit lg:w-80 shrink-0 pr-8 block lg:mb-4 mt-4.5'>
            <CopyMarkdownButton markdown={post.content} />
            <TableOfContents headings={post.headings} />
            <Button variant='outline' className='w-full'>
              Comece grátis
            </Button>
          </div>
          <BlogContent html={post.contentHtml} />
        </div>
      </div>
    </main>
  )
}
