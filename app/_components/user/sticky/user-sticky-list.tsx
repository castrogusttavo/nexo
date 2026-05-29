'use client'

import { UserStick } from '@/app/_components/user/sticky/user-sticky'
import { Muted } from '@/components/typography/text/muted'
import { Skeleton } from '@/components/ui/skeleton'
import { useStickyNotes } from '@/src/hooks/use-sticky-note'

const SKELETON_KEYS = ['s1', 's2', 's3']

export function UserStickyList() {
  const { data, isPending, isError } = useStickyNotes()

  if (isPending) {
    return (
      <div className='flex flex-wrap gap-3'>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className='w-67.5 h-80 rounded-sm' />
        ))}
      </div>
    )
  }

  if (isError) {
    return <Muted>Não foi possível carregar suas anotações.</Muted>
  }

  if (data.length === 0) {
    return <Muted>Nenhuma anotação ainda.</Muted>
  }

  return (
    <div className='flex flex-wrap gap-3'>
      {data.map((sticky) => (
        <UserStick key={sticky.id} sticky={sticky} />
      ))}
    </div>
  )
}
