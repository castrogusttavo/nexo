'use client'

import { Search01Icon } from '@hugeicons-pro/core-stroke-rounded'
import Image from 'next/image'
import Link from 'next/link'
import { useQueryStates } from 'nuqs'
import { useMemo, useState, useTransition } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { BLOG_POST_TAG_LABELS } from '@/src/lib/blog/blog-labels'
import { blogSearchParser, blogTagParser } from '@/src/lib/blog/blog-params'
import { formatPostDate } from '@/src/lib/blog/format-ṕost-date'
import { BLOG_POST_TAGS } from '@/src/schemas/blog-post.schema'
import type { BlogPostMetaDTO } from '@/types/blog-post'

const PER_PAGE = 8
const PAGE_WINDOW_SIZE = 3

interface BlogListProps {
  posts: BlogPostMetaDTO[]
}

function getPageWindow(current: number, total: number) {
  if (total <= PAGE_WINDOW_SIZE) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const start = Math.min(Math.max(current - 1, 1), total - PAGE_WINDOW_SIZE + 1)
  return Array.from({ length: PAGE_WINDOW_SIZE }, (_, i) => start + i)
}

export function BlogList({ posts }: BlogListProps) {
  const [{ tag, search }, setFilters] = useQueryStates({
    tag: blogTagParser,
    search: blogSearchParser,
  })
  const [page, setPage] = useState(1)
  const [_isPending, startTransition] = useTransition()

  const presentTags = useMemo(
    () => BLOG_POST_TAGS.filter((t) => posts.some((post) => post.tag === t)),
    [posts],
  )

  const filtered = useMemo(() => {
    const query = search?.trim().toLowerCase()
    return posts.filter((post) => {
      if (tag && post.tag !== tag) return false
      if (query && !post.title.toLowerCase().includes(query)) return false
      return true
    })
  }, [posts, tag, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  )
  const pageWindow = getPageWindow(currentPage, totalPages)

  function updateFilters(next: Parameters<typeof setFilters>[0]) {
    startTransition(() => {
      setFilters(next)
      setPage(1)
    })
    document
      .getElementById('list')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function goToPage(nextPage: number) {
    startTransition(() => {
      setPage(nextPage)
    })
  }

  if (posts.length === 0) {
    return <Muted>Nenhum post publicado ainda.</Muted>
  }

  return (
    <div className='w-full flex flex-col gap-8 items-center'>
      <div className='w-full flex items-center justify-between gap-4'>
        <div className='flex flex-wrap gap-2'>
          <Button
            variant={tag ? 'ghost' : 'default'}
            size='sm'
            onClick={() => updateFilters({ tag: null })}
          >
            Todas
          </Button>
          {presentTags.map((t) => (
            <Button
              key={t}
              variant={tag === t ? 'default' : 'ghost'}
              size='sm'
              onClick={() => updateFilters({ tag: tag === t ? null : t })}
            >
              {BLOG_POST_TAG_LABELS[t]}
            </Button>
          ))}
        </div>
        <div className='relative'>
          <NexoIcon
            icon={Search01Icon}
            size={16}
            className='absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground'
          />
          <Input
            value={search ?? ''}
            onChange={(e) => updateFilters({ search: e.target.value || null })}
            placeholder='Buscar por título'
            className='pl-8'
          />
        </div>
      </div>
      {filtered.length === 0 && <Muted>Nenhum post corresponde à busca.</Muted>}
      <div id='list' className='w-full grid grid-cols-1 sm:grid-cols-2 gap-6'>
        {paginated.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className='rounded-xl px-0 md:px-8 p-8 min-h-41 hover:bg-accent transition-colors flex items-center gap-6'
          >
            <Image
              src={post.cover || ''}
              alt={`${post.slug}.png`}
              width={200}
              height={100}
              className='rounded-lg'
            />
            <div className='flex flex-col gap-2'>
              <h4 className='font-medium text-lg text-primary'>{post.title}</h4>
              <Muted>
                {BLOG_POST_TAG_LABELS[post.tag]} · {formatPostDate(post.date)} ·
                Gusttavo Castro
              </Muted>
            </div>
          </Link>
        ))}
        {Array.from({ length: PER_PAGE - paginated.length }, (_, i) => (
          <div key={`placeholder-${i}`} className='min-h-41' aria-hidden />
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => goToPage(currentPage - 1)} />
            </PaginationItem>
            {pageWindow.map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === currentPage}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext onClick={() => goToPage(currentPage + 1)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
