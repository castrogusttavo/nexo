'use client'

import * as React from 'react'
import { importDocx } from '@platejs/docx-io'
import { MarkdownPlugin } from '@platejs/markdown'
import { ArrowUpToLineIcon } from 'lucide-react'
import { getEditorDOMFromHtmlString } from 'platejs/static'
import { useEditorRef } from 'platejs/react'
import { useFilePicker } from 'use-file-picker'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ToolbarButton } from './toolbar'

type ImportType = 'html' | 'markdown'

export function ImportToolbarButton(props: React.ComponentProps<typeof DropdownMenu>) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)

  const getFileNodes = (text: string, type: ImportType) => {
    if (type === 'html') {
      const editorNode = getEditorDOMFromHtmlString(text)
      return editor.api.html.deserialize({ element: editorNode })
    }

    if (type === 'markdown') {
      return editor.getApi(MarkdownPlugin).markdown.deserialize(text)
    }

    return []
  }

  const { openFilePicker: openMdFilePicker } = useFilePicker({
    accept: ['.md', '.mdx'],
    multiple: false,
    onFilesSuccessfullySelected: async ({ plainFiles }: { plainFiles: File[] }) => {
      const text = await plainFiles[0].text()
      const nodes = getFileNodes(text, 'markdown')
      editor.tf.insertNodes(nodes)
    },
  })

  const { openFilePicker: openHtmlFilePicker } = useFilePicker({
    accept: ['text/html'],
    multiple: false,
    onFilesSuccessfullySelected: async ({ plainFiles }: { plainFiles: File[] }) => {
      const text = await plainFiles[0].text()
      const nodes = getFileNodes(text, 'html')
      editor.tf.insertNodes(nodes)
    },
  })

  const { openFilePicker: openDocxFilePicker } = useFilePicker({
    accept: ['.docx'],
    multiple: false,
    onFilesSuccessfullySelected: async ({ plainFiles }: { plainFiles: File[] }) => {
      const arrayBuffer = await plainFiles[0].arrayBuffer()
      const result = await importDocx(editor, arrayBuffer)
      editor.tf.insertNodes(result.nodes as typeof editor.children)
    },
  })

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton pressed={open} tooltip='Importar' isDropdown>
            <ArrowUpToLineIcon className='size-4' />
          </ToolbarButton>
        }
      />

      <DropdownMenuContent align='start'>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => openHtmlFilePicker()}>Importar de HTML</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openMdFilePicker()}>Importar de Markdown</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDocxFilePicker()}>Importar de Word</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
