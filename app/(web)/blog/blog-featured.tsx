import { ArrowRight02Icon } from '@hugeicons-pro/core-stroke-rounded'
import Image from 'next/image'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { BLOG_POST_TAG_LABELS } from '@/src/lib/blog/blog-labels'
import { formatPostDate } from '@/src/lib/blog/format-ṕost-date'
import type { BlogPostMetaDTO } from '@/types/blog-post'

interface BlogFeaturedProps {
  featured: BlogPostMetaDTO
  highlighted: BlogPostMetaDTO[]
}

export function BlogFeatured({ featured, highlighted }: BlogFeaturedProps) {
  return (
    <div className='w-full flex flex-col gap-8'>
      <Link
        href={`/blog/${featured.slug}`}
        className='w-full rounded-2xl py-8 flex justify-between items-center gap-6'
      >
        <div className='space-y-6'>
          <div className='space-y-2'>
            <Muted className='font-semibold'>
              {BLOG_POST_TAG_LABELS[featured.tag]} ·{' '}
              {formatPostDate(featured.date)}
            </Muted>
            <h4 className='font-normal text-2xl'>{featured.title}</h4>
            <Muted className='font-normal text-base'>{featured.excerpt}</Muted>
            <Muted className='font-light'>Gusttavo Castro</Muted>
          </div>
          <Button variant='outline' size='sm'>
            Leia mais <NexoIcon icon={ArrowRight02Icon} />
          </Button>
        </div>

        <Image
          src={featured.cover ?? ''}
          alt={`${featured.slug}.png`}
          width={700}
          height={500}
          className='rounded-xl'
        />
      </Link>
      {highlighted.length > 0 && (
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-6'>
          {highlighted.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className='rounded-xl border border-border hover:bg-accent transition-colors flex flex-col gap-2'
            >
              <Image
                src={post.cover ?? ''}
                alt={`${post.slug}.png`}
                width={500}
                height={300}
                className='rounded-xl'
              />
              <div className='px-4 py-6 space-y-1'>
                <Muted>
                  {BLOG_POST_TAG_LABELS[post.tag]} · {formatPostDate(post.date)}
                </Muted>
                <h4 className='font-medium text-base'>{post.title}</h4>
                <Muted className='font-light'>Gusttavo Castro</Muted>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
