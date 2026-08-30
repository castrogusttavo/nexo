'use client'

import * as React from 'react'
import { useEditorRef, useEditorSelector } from 'platejs/react'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu'
import { ToolbarButton } from './toolbar'

const COLORS = [
  { name: 'Preto', value: '#09090b' },
  { name: 'Cinza', value: '#71717a' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Roxo', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
]

export function FontColorToolbarButton({
  nodeType,
  tooltip,
  children,
}: {
  nodeType: string
  tooltip: string
  children: React.ReactNode
}) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)
  const value = useEditorSelector(
    (editor) => editor.api.marks()?.[nodeType] as string | undefined,
    [nodeType]
  )

  function apply(color: string | undefined) {
    if (color) {
      editor.tf.addMarks({ [nodeType]: color })
    } else {
      editor.tf.removeMarks(nodeType)
    }
    editor.tf.focus()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton pressed={open} tooltip={tooltip} isDropdown>
            {children}
          </ToolbarButton>
        }
      />
      <DropdownMenuContent align='start' className='w-auto p-2'>
        <div className='grid grid-cols-5 gap-1'>
          {COLORS.map((color) => (
            <button
              key={color.value}
              type='button'
              aria-label={color.name}
              onClick={() => apply(color.value)}
              className={cn(
                'size-6 rounded-full border border-border',
                value === color.value && 'ring-2 ring-ring ring-offset-1'
              )}
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>
        <button
          type='button'
          onClick={() => apply(undefined)}
          className='mt-2 w-full rounded-sm border border-border py-1 text-xs hover:bg-accent'
        >
          Remover cor
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
