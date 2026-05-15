'use client'

import { Muted } from '@/components/typography/text/muted'
import { Skeleton } from '@/components/ui/skeleton'
import { useShortLinks } from '@/src/hooks/use-short-link'
import { UserShortcutLink } from './user-shortcut-link'

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5']

export function UserShortcutLinkList() {
  const { data, isPending, isError } = useShortLinks()

  if (isPending) {
    return (
      <div className='flex gap-2 mb-2 flex-wrap flex-1'>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className='min-h-14 w-57.5' />
        ))}
      </div>
    )
  }

  if (isError) {
    return <Muted>Não foi possível carregar os links rápidos.</Muted>
  }

  if (data.length === 0) {
    return <Muted>Nenhum link rápido ainda.</Muted>
  }

  return (
    <div className='flex gap-2 mb-2 flex-wrap flex-1'>
      {data.map((link) => {
        return (
          <UserShortcutLink
            key={link.id}
            url={link.url}
            title={link.title}
            createdAt={link.createdAt}
          />
        )
      })}
    </div>
  )
}
