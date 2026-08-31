'use client'

import { Baseline, Bold, Code2, Italic, PaintBucket, Strikethrough, Underline } from 'lucide-react'
import { KEYS } from 'platejs'
import { AlignToolbarButton } from './align-toolbar-button'
import { FontColorToolbarButton } from './font-color-toolbar-button'
import { FontSizeToolbarButton } from './font-size-toolbar-button'
import { RedoToolbarButton, UndoToolbarButton } from './history-toolbar-button'
import { IndentToolbarButton, OutdentToolbarButton } from './indent-toolbar-button'
import { LineHeightToolbarButton } from './line-height-toolbar-button'
import { BulletedListToolbarButton, NumberedListToolbarButton, TodoListToolbarButton } from './list-toolbar-button'
import { MarkToolbarButton } from './mark-toolbar-button'
import { ToolbarGroup } from './toolbar'
import { TurnIntoToolbarButton } from './turn-into-toolbar-button'
import { InsertToolbarButton } from './insert-toolbar-button'
import { MediaToolbarButton } from './media-toolbar-button'
import { LinkToolbarButton } from './link-toolbar-button'
import { TableToolbarButton } from './table-toolbar-button'
import { EmojiToolbarButton } from './emoji-toolbar-button'

export function FixedToolbarButtons() {
  return (
    <div className='flex w-full items-center gap-1 overflow-x-auto'>
      <ToolbarGroup>
        <UndoToolbarButton />
        <RedoToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <InsertToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <TurnIntoToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <FontSizeToolbarButton />
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
        <FontColorToolbarButton nodeType='color' tooltip='Cor do texto'>
          <Baseline />
        </FontColorToolbarButton>
        <FontColorToolbarButton nodeType='backgroundColor' tooltip='Cor de fundo'>
          <PaintBucket />
        </FontColorToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <AlignToolbarButton />
        <NumberedListToolbarButton />
        <BulletedListToolbarButton />
        <TodoListToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <LinkToolbarButton />
        <TableToolbarButton />
        <EmojiToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <MediaToolbarButton nodeType={KEYS.img} />
        <MediaToolbarButton nodeType={KEYS.video} />
        <MediaToolbarButton nodeType={KEYS.audio} />
        <MediaToolbarButton nodeType={KEYS.file} />
      </ToolbarGroup>

      <ToolbarGroup>
        <LineHeightToolbarButton />
        <OutdentToolbarButton />
        <IndentToolbarButton />
      </ToolbarGroup>
    </div>
  )
}
