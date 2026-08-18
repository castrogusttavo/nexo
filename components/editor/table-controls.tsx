'use client'

import type { Editor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import { NexoIcon } from "../icon/icon"
import { Delete02Icon } from "@hugeicons-pro/core-stroke-rounded"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function TableControls({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey='tableControls'
      shouldShow={({ editor }) => editor.isActive('table')}
      className="flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md"
    >
      <Button type='button' variant='ghost' size='sm' onClick={() => editor.chain().focus().addRowAfter().run()}>
        + Linha
      </Button>
      <Button type='button' variant='ghost' size='sm' onClick={() => editor.chain().focus().addColumnAfter().run()}>
        + Coluna
      </Button>
      <Separator orientation='vertical' className='mx-0.5 h-4' />
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='text-destructive hover:text-destructive'
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        Excluir linha
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='text-destructive hover:text-destructive'
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        Excluir coluna
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='icon-sm'
        className='text-destructive hover:text-destructive'
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <NexoIcon icon={Delete02Icon} strokeWidth={2} />
      </Button>
    </BubbleMenu>
  )
}
