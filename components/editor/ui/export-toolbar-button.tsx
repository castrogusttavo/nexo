'use client'

import * as React from 'react'
import { exportToDocx } from '@platejs/docx-io'
import { MarkdownPlugin } from '@platejs/markdown'
import { ArrowDownToLineIcon } from 'lucide-react'
import type { SlatePlugin } from 'platejs'
import { createSlateEditor } from 'platejs'
import { useEditorRef } from 'platejs/react'
import { serializeHtml } from 'platejs/static'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { BaseEditorKit } from '@/components/editor/editor-base-kit'
import { EditorStatic } from './editor-static'
import { ToolbarButton } from './toolbar'

export function ExportToolbarButton(props: React.ComponentProps<typeof DropdownMenu>) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)

  const getCanvas = async () => {
    const { default: html2canvas } = await import('html2canvas-pro')

    const style = document.createElement('style')
    document.head.append(style)

    const canvas = await html2canvas(editor.api.toDOMNode(editor)!, {
      onclone: (clonedDocument: Document) => {
        const editorElement = clonedDocument.querySelector('[contenteditable="true"]')
        if (editorElement) {
          Array.from(editorElement.querySelectorAll('*')).forEach((element) => {
            const existingStyle = element.getAttribute('style') || ''
            element.setAttribute(
              'style',
              `${existingStyle}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important`
            )
          })
        }
      },
    })
    style.remove()

    return canvas
  }

  const downloadFile = async (url: string, filename: string) => {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()

    window.URL.revokeObjectURL(blobUrl)
  }

  const exportToPdf = async () => {
    const canvas = await getCanvas()

    const PDFLib = await import('pdf-lib')
    const pdfDoc = await PDFLib.PDFDocument.create()
    const page = pdfDoc.addPage([canvas.width, canvas.height])
    const imageEmbed = await pdfDoc.embedPng(canvas.toDataURL('PNG'))
    const { height, width } = imageEmbed.scale(1)
    page.drawImage(imageEmbed, { height, width, x: 0, y: 0 })
    const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: true })

    await downloadFile(pdfBase64, 'pagina.pdf')
  }

  const exportToImage = async () => {
    const canvas = await getCanvas()
    await downloadFile(canvas.toDataURL('image/png'), 'pagina.png')
  }

  const exportToHtml = async () => {
    const editorStatic = createSlateEditor({
      plugins: BaseEditorKit,
      value: editor.children,
    })

    const editorHtml = await serializeHtml(editorStatic, {
      editorComponent: EditorStatic,
      props: { style: { padding: '0 calc(50% - 350px)', paddingBottom: '' } },
    })

    const html = `<!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        ${editorHtml}
      </body>
    </html>`

    const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`

    await downloadFile(url, 'pagina.html')
  }

  const exportToMarkdown = async () => {
    const md = editor.getApi(MarkdownPlugin).markdown.serialize()
    const url = `data:text/markdown;charset=utf-8,${encodeURIComponent(md)}`
    await downloadFile(url, 'pagina.md')
  }

  const exportToWord = async () => {
    const blob = await exportToDocx(editor.children, {
      editorPlugins: [...BaseEditorKit] as SlatePlugin[],
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pagina.docx'
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton pressed={open} tooltip='Exportar' isDropdown>
            <ArrowDownToLineIcon className='size-4' />
          </ToolbarButton>
        }
      />

      <DropdownMenuContent align='start'>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={exportToHtml}>Exportar como HTML</DropdownMenuItem>
          <DropdownMenuItem onClick={exportToPdf}>Exportar como PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={exportToImage}>Exportar como imagem</DropdownMenuItem>
          <DropdownMenuItem onClick={exportToMarkdown}>Exportar como Markdown</DropdownMenuItem>
          <DropdownMenuItem onClick={exportToWord}>Exportar como Word</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
