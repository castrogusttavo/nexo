'use client'

import { cn } from "@/lib/utils"
import { EditorContent, JSONContent, useEditor } from "@tiptap/react"
import { getEditorExtensions } from "./extensions"
import { SlashCommand } from "./slash-command"
import { createSlashSuggestion } from "./slash-menu"
import { EditorBubbleMenu } from "./bubble-menu"
import { useUploadEditorMedia } from "@/src/hooks/use-editor-media"
import { SLASH_COMMAND_ITEMS } from "./slash-items"
import { createImageUploadItem, createVideoUploadItem } from "./media-items"
import { useMemo } from "react"
import { createCycleEmbedItem, createExternalEmbedItem, createIssueEmbedItem } from "../../lib/embed-items"
import { useCycles } from "@/src/hooks/use-cycle"
import { useResolveEmbed } from "@/src/hooks/use-embed-metadata"
import { ADVANCED_SLASH_ITEMS } from "@/lib/advanced-items"
import { TableControls } from "./table-controls"

interface IssueRichEditorProps {
  content: JSONContent
  onChange: (content: JSONContent) => void
  className?: string
  workspaceId: string
  projectSlug: string
}

export function IssueRichEditor({ content, onChange, className, workspaceId, projectSlug }: IssueRichEditorProps) {
  const uploadMedia = useUploadEditorMedia(workspaceId, projectSlug)
  const resolveEmbed = useResolveEmbed(workspaceId, projectSlug)
  const { data: cycles } = useCycles(workspaceId, projectSlug)

  const slashItems = useMemo(
    () => [
      ...SLASH_COMMAND_ITEMS,
      ...ADVANCED_SLASH_ITEMS,
      createImageUploadItem((file) => uploadMedia.mutateAsync(file)),
      createVideoUploadItem((file) => uploadMedia.mutateAsync(file)),
      createExternalEmbedItem((url) => resolveEmbed.mutateAsync(url)),
      createIssueEmbedItem(),
      createCycleEmbedItem(cycles ?? [])
    ],
    [uploadMedia.mutateAsync, resolveEmbed.mutateAsync, cycles]
  )

  const editor = useEditor({
    extensions: [
      ...getEditorExtensions({ workspaceId, projectSlug }),
      SlashCommand.configure({ suggestion: createSlashSuggestion(slashItems) })
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON())
  })

  if (!editor) return null

  return (
    <>
      <EditorBubbleMenu editor={editor} />
      <TableControls editor={editor} />
      <EditorContent
        editor={editor}
        className={cn('tiptap typeset max-w-none', className)}
      />
    </>
  )
}
