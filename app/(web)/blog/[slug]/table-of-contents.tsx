import { cn } from '@/lib/utils'
import type { BlogPostHeading } from '@/types/blog-post'

const HEADING_INDENT: Record<BlogPostHeading['level'], string> = {
  1: '',
  2: '',
  3: 'pl-4',
  4: 'pl-8',
}

interface TableOfContentsProps {
  headings: BlogPostHeading[]
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length === 0) return null

  return (
    <div className='py-6 border-y border-border'>
      <span className='text-sm font-medium'>Tabela de conteúdos</span>
      <ul className='mt-3 space-y-2 text-sm text-muted-foreground'>
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={cn(
              HEADING_INDENT[heading.level],
              'hover:text-foreground transition-colors hover:underline',
            )}
          >
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
