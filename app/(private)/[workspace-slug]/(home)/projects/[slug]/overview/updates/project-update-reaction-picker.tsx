'use client'

import { LaughIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { EmojiSearchPicker } from '@/components/emoji-search-picker'
import { NexoIcon } from '@/components/icon/icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UpdateReactionSummaryDTO } from '@/types/updates'

type ProjectUpdateReactionPickerProps = {
  reactions: UpdateReactionSummaryDTO[]
  onToggle: (emoji: string, reacted: boolean) => void
}

export function ProjectUpdateReactionPicker({
  reactions,
  onToggle,
}: ProjectUpdateReactionPickerProps) {
  const [open, setOpen] = useState(false)

  function handleSelect(emoji: string) {
    setOpen(false)
    const mine = reactions.some((r) => r.emoji === emoji && r.reactedByMe)
    if (!mine) onToggle(emoji, true)
  }

  return (
    <div className='flex items-center gap-2'>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type='button'
          aria-pressed={r.reactedByMe}
          aria-label={`${r.emoji} ${r.count}`}
          onClick={() => onToggle(r.emoji, !r.reactedByMe)}
          className='rounded-full'
        >
          <Badge variant={r.reactedByMe ? 'info' : 'secondary'}>
            {r.emoji} {r.count}
          </Badge>
        </button>
      ))}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Button variant='secondary' size='icon-xs' aria-label='Reagir'>
              <NexoIcon icon={LaughIcon} strokeWidth={2} />
            </Button>
          }
        />
        <DropdownMenuContent className='min-w-fit w-fit max-w-fit'>
          <EmojiSearchPicker onSelect={handleSelect} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
