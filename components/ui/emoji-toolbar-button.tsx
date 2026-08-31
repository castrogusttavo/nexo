'use client'

import * as React from 'react'
import { Search01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { EmojiPicker as EmojiPickerPrimitive } from 'frimousse'
import { SmileIcon } from 'lucide-react'
import { useEditorRef } from 'platejs/react'
import { NexoIcon } from '@/components/icon/icon'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EmojiPicker, EmojiPickerContent } from '@/components/ui/emoji-picker'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ToolbarButton } from './toolbar'

export function EmojiToolbarButton(props: React.ComponentProps<typeof ToolbarButton>) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton {...props} pressed={open} tooltip='Emoji' isDropdown>
            <SmileIcon />
          </ToolbarButton>
        }
      />
      <DropdownMenuContent className='w-auto p-2.5' align='start'>
        <EmojiPicker
          className='h-81.5 scrollbar-hidden overflow-visible w-80'
          onEmojiSelect={({ emoji }) => {
            editor.tf.insertText(emoji)
            editor.tf.focus()
            setOpen(false)
          }}
        >
          <div onKeyDown={(e) => e.stopPropagation()} className='flex items-center gap-2 z-50'>
            <InputGroup className='flex-1'>
              <InputGroupInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Pesquisar' />
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
