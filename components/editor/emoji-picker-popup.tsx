'use client'

import { EmojiPicker } from "frimousse"
import { Editor, Range, ReactRenderer } from "@tiptap/react"
import { computePosition, flip, offset, shift } from "@floating-ui/react"

function EmojiPickerPopup({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <EmojiPicker.Root
      onEmojiSelect={(emoji) => onSelect(emoji.emoji)}
      className='flex h-80 w-64 flex-col rounded-md border border-border bg-popover shadow-md'
    >
      <EmojiPicker.Search className='m-1 rounded-sm border border-border px-2 py-1 text-sm' />
      <EmojiPicker.Viewport className='flex-1 overflow-y-auto'>
        <EmojiPicker.Loading className='p-2 text-muted-foreground text-xs'>
          Carregando...
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className='p-2 text-muted-foreground text-xs'>
          Nenhum resultado.
        </EmojiPicker.Empty>
        <EmojiPicker.List />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  )
}

export function openEmojiPicker(editor: Editor, range: Range) {
  const popup = document.createElement('div')
  popup.style.position = 'absolute'
  popup.style.zIndex = '50'
  document.body.appendChild(popup)

  function close() {
    component.destroy()
    popup.remove()
    document.removeEventListener('mousedown', onOutsideClick)
  }

  function onOutsideClick(event: MouseEvent) {
    if (!popup.contains(event.target as Node)) close()
  }

  const component = new ReactRenderer(EmojiPickerPopup, {
    props: {
      onSelect: (emoji: string) => {
        editor.chain().focus().deleteRange(range).insertContent(emoji).run()
        close()
      },
    },
    editor,
  })

  popup.appendChild(component.element)

  const start = editor.view.coordsAtPos(range.from)
  const virtualEl = {
    getBoundingClientRect: () =>
      new DOMRect(start.left, start.top, 0, start.bottom - start.top),
  }

  computePosition(virtualEl, popup, {
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  }).then(({ x, y }) => {
    popup.style.left = `${x}px`
    popup.style.top = `${y}px`
  })

  document.addEventListener('mousedown', onOutsideClick)
}
