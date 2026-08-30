'use client'

import { Bold, Code2, Italic, Strikethrough, Underline } from 'lucide-react'
import { MarkToolbarButton } from './mark-toolbar-button'
import { ToolbarGroup } from './toolbar'
import { TurnIntoToolbarButton } from './turn-into-toolbar-button'

export function FloatingToolbarButtons() {
  return (
    <>
      <ToolbarGroup>
        <TurnIntoToolbarButton />
      </ToolbarGroup>
      <ToolbarGroup>
        <MarkToolbarButton nodeType='bold' tooltip='Negrito'>
          <Bold />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType='italic' tooltip='Itálico'>
          <Italic />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType='underline' tooltip='Sublinhado'>
          <Underline />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType='strikethrough' tooltip='Riscado'>
          <Strikethrough />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType='code' tooltip='Código'>
          <Code2 />
        </MarkToolbarButton>
      </ToolbarGroup>
    </>
  )
}
