'use client'

import { Search01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { EmojiPicker as EmojiPickerPrimitive } from 'frimousse'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { EmojiPicker, EmojiPickerContent } from '@/components/ui/emoji-picker'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

interface EmojiSearchPickerProps {
  className?: string
  onSelect: (emoji: string) => void
}

/**
 * Emoji grid with a search field and the skin tone selector. Our input drives
 * frimousse's hidden Search, so the field can use the design system's look.
 */
export function EmojiSearchPicker({
  className,
  onSelect,
}: EmojiSearchPickerProps) {
  const [search, setSearch] = useState('')

  return (
    <EmojiPicker
      className={cn('h-81.5 scrollbar-hidden overflow-visible', className)}
      onEmojiSelect={({ emoji }) => onSelect(emoji)}
    >
      {/* Keys typed in the search must not reach the menu's typeahead. */}
      <div
        onKeyDown={(e) => e.stopPropagation()}
        className='flex items-center gap-2 z-50'
      >
        <InputGroup className='flex-1'>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Pesquisar'
          />
          <InputGroupAddon align='inline-start'>
            <NexoIcon icon={Search01Icon} />
          </InputGroupAddon>
        </InputGroup>
        <EmojiPickerPrimitive.SkinToneSelector className='flex size-9 items-center justify-center rounded-md text-lg transition-colors' />
        <EmojiPickerPrimitive.Search
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='sr-only hidden'
          tabIndex={-1}
          aria-hidden='true'
        />
      </div>
      <EmojiPickerContent className='scrollbar-hidden w-full justify-between' />
    </EmojiPicker>
  )
}
