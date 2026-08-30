'use client'

import { Bold, Code2, Italic, Strikethrough, Underline } from 'lucide-react'
import { RedoToolbarButton, UndoToolbarButton } from './history-toolbar-button'
import { BulletedListToolbarButton, NumberedListToolbarButton, TodoListToolbarButton } from './list-toolbar-button'
import { MarkToolbarButton } from './mark-toolbar-button'
import { ToolbarGroup } from './toolbar'
import { TurnIntoToolbarButton } from './turn-into-toolbar-button'

export function FixedToolbarButtons() {
  return (
    <div className='flex w-full items-center gap-1 overflow-x-auto'>
      <ToolbarGroup>
        <UndoToolbarButton />
        <RedoToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <TurnIntoToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <MarkToolbarButton nodeType='bold' tooltip='Negrito' command='cmd+B'>
          <Bold />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType='italic' tooltip='Itálico' command='cmd+I'>
          <Italic />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType='underline' tooltip='Sublinhado' command='cmd+U'>
          <Underline />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType='strikethrough' tooltip='Riscado' command='cmd+S'>
          <Strikethrough />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType='code' tooltip='Código' command='cmd+E'>
          <Code2 />
        </MarkToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <NumberedListToolbarButton />
        <BulletedListToolbarButton />
        <TodoListToolbarButton />
      </ToolbarGroup>
    </div>
  )
}
