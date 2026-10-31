'use client'

import type { Value } from 'platejs'
import { Plate, usePlateEditor } from 'platejs/react'
import { cn } from '@/lib/utils'
import { WikiEditorProvider } from '@/src/hooks/use-wiki-editor-context'
import { AlignKit } from './plugins/align-kit'
import { BasicNodesKit } from './plugins/basic-nodes-kit'
import { BlockMenuKit } from './plugins/block-menu-kit'
import { CodeBlockKit } from './plugins/code-block-kit'
import { CodeDrawingKit } from './plugins/code-drawing-kit'
import { ColumnKit } from './plugins/column-kit'
import { DateKit } from './plugins/date-kit'
import { DndKit } from './plugins/dnd-kit'
import { DocxKit } from './plugins/docx-kit'
import { EmojiKit } from './plugins/emoji-kit'
import { ExcalidrawKit } from './plugins/excalidraw-kit'
import { FloatingToolbarNoCommentsKit } from './plugins/floating-toolbar-kit'
import { FontKit } from './plugins/font-kit'
import { FootnoteKit } from './plugins/footnote-kit'
import { LineHeightKit } from './plugins/line-height-kit'
import { LinkKit } from './plugins/link-kit'
import { ListKit } from './plugins/list-kit'
import { MarkdownKit } from './plugins/markdown-kit'
import { MathKit } from './plugins/math-kit'
import { MediaKit } from './plugins/media-kit'
import { MentionKit } from './plugins/mention-kit'
import { SlashKit } from './plugins/slash-kit'
import { TableKit } from './plugins/table-kit'
import { TocKit } from './plugins/toc-kit'
import { ToggleKit } from './plugins/toggle-kit'
import { Editor, EditorContainer } from './ui/editor'

const TEXT_EDITOR_PLUGINS = [
  ...BasicNodesKit,
  ...ListKit,
  ...CodeBlockKit,
  ...ColumnKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...LinkKit,
  ...DateKit,
  ...MathKit,
  ...EmojiKit,
  ...MentionKit,
  ...SlashKit,
  ...TableKit,
  ...CodeDrawingKit,
  ...ExcalidrawKit,
  ...FootnoteKit,
  ...MarkdownKit,
  ...DocxKit,
  ...AlignKit,
  ...FontKit,
  ...LineHeightKit,
  ...BlockMenuKit,
  ...DndKit,
  ...FloatingToolbarNoCommentsKit,
]

interface TextEditorProps {
	workspaceId: string
	userId: string
	userName: string
	value: Value
	onChange?: (value: Value) => void
	placeholder?: string
	readOnly?: boolean
	className?: string
}

export function TextEditor({
	workspaceId,
	userId,
	userName,
	value,
	onChange,
	placeholder,
	readOnly,
	className
}: TextEditorProps) {
	const editor = usePlateEditor({ plugins: TEXT_EDITOR_PLUGINS, value })

	return (
		<WikiEditorProvider
      workspaceId={workspaceId}
      // Only the comment and discussion hooks read this, and neither is here.
      wikiPageId=''
      userId={userId}
      userName={userName}
    >
      <Plate
        editor={editor}
        readOnly={readOnly}
        onChange={({ value: next }) => onChange?.(next)}
      >
        <EditorContainer className={cn('no-scrollbar', className)}>
          <Editor placeholder={placeholder} />
        </EditorContainer>
      </Plate>
    </WikiEditorProvider>
	)
}