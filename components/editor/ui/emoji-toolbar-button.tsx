'use client'

import * as React from 'react'
import { SmileIcon } from 'lucide-react'
import { useEditorRef } from 'platejs/react'
import { EmojiSearchPicker } from '@/components/emoji-search-picker'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ToolbarButton } from './toolbar'

export function EmojiToolbarButton(props: React.ComponentProps<typeof ToolbarButton>) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)

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
        <EmojiSearchPicker
          className='w-80'
          onSelect={(emoji) => {
            editor.tf.insertText(emoji)
            editor.tf.focus()
            setOpen(false)
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
