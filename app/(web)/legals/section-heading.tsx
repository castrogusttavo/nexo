import Link from 'next/link'
import type { ReactNode } from 'react'
import { H2 } from '@/components/typography/heading/h2'
import { H3 } from '@/components/typography/heading/h3'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  as: 'h2' | 'h3'
  id: string
  className?: string
  children: ReactNode
}

// O "#" é absolute sem "top" definido — isso faz o navegador manter a
// posição vertical estática (a mesma que teria no fluxo normal do texto),
// então ele alinha com a linha do título sem cálculo manual de centralização.
// "-left-6" a partir da própria tag (não de um wrapper com padding) garante
// que h2 e h3 formem a mesma régua vertical à esquerda.
export function SectionHeading({
  as,
  id,
  className,
  children,
}: SectionHeadingProps) {
  const Tag = as === 'h2' ? H2 : H3

  return (
    <Tag className={cn('group relative', className)}>
      <Link
        href={`#${id}`}
        aria-label='Link para esta seção'
        tabIndex={-1}
        className='absolute -left-6 hidden select-none text-transparent transition-colors group-hover:text-muted-foreground/60 hover:no-underline md:inline-block'
      >
        #
      </Link>
      <Link href={`#${id}`} className='hover:underline'>
        {children}
      </Link>
    </Tag>
  )
}
