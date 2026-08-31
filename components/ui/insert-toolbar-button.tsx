'use client'

import {
  CalendarIcon,
  ChevronRightIcon,
  Code2,
  Columns3Icon,
  FileCodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  PenToolIcon,
  PilcrowIcon,
  PlusIcon,
  QuoteIcon,
  RadicalIcon,
  SquareIcon,
  TableIcon,
  TableOfContentsIcon,
} from "lucide-react"
import { KEYS } from "platejs"
import { useEditorRef } from "platejs/react"
import React from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu"
import { ToolbarButton, ToolbarMenuGroup } from "./toolbar"
import { insertBlock, insertInlineElement } from "../editor/transforms"

type Item = {
  icon: React.ReactNode
  value: string
  label: string
}

type Group = {
  group: string
  insert: 'block' | 'inline'
  items: Item[]
}

const groups: Group[] = [
  {
    group: 'Blocos básicos',
    insert: 'block',
    items: [
      { icon: <PilcrowIcon />, label: 'Texto', value: KEYS.p },
      { icon: <Heading1Icon />, label: 'Título 1', value: KEYS.h1 },
      { icon: <Heading2Icon />, label: 'Título 2', value: KEYS.h2 },
      { icon: <Heading3Icon />, label: 'Título 3', value: KEYS.h3 },
      { icon: <Heading4Icon />, label: 'Título 4', value: KEYS.h4 },
      { icon: <Heading5Icon />, label: 'Título 5', value: KEYS.h5 },
      { icon: <Heading6Icon />, label: 'Título 6', value: KEYS.h6 },
      { icon: <FileCodeIcon />, label: 'Código', value: KEYS.codeBlock },
      { icon: <TableIcon />, label: 'Tabela', value: KEYS.table },
      { icon: <QuoteIcon />, label: 'Citação', value: KEYS.blockquote },
      { icon: <MinusIcon />, label: 'Divisor', value: KEYS.hr },
    ]
  },
  {
    group: 'Listas',
    insert: 'block',
    items: [
      { icon: <ListIcon />, label: 'Lista com marcadores', value: KEYS.ul },
      { icon: <ListOrderedIcon />, label: 'Lista numerada', value: KEYS.ol },
      { icon: <SquareIcon />, label: 'Lista de tarefas', value: KEYS.listTodo },
      { icon: <ChevronRightIcon />, label: 'Lista alternável', value: KEYS.toggle },
    ]
  },
  {
    group: 'Blocos avançados',
    insert: 'block',
    items: [
      { icon: <TableOfContentsIcon />, label: 'Sumário', value: KEYS.toc },
      { icon: <Columns3Icon />, label: '3 colunas', value: 'action_three_columns' },
      { icon: <RadicalIcon />, label: 'Equação', value: KEYS.equation },
      { icon: <PenToolIcon />, label: 'Excalidraw', value: KEYS.excalidraw },
      { icon: <Code2 />, label: 'Diagrama (mermaid)', value: KEYS.codeDrawing },
    ]
  },
  {
    group: 'Inline',
    insert: 'inline',
    items: [
      { icon: <LinkIcon />, label: 'Link', value: KEYS.link },
      { icon: <CalendarIcon />, label: 'Data', value: KEYS.date },
      { icon: <RadicalIcon />, label: 'Equação inline', value: KEYS.inlineEquation },
    ]
  }
]

export function InsertToolbarButton(
  props: React.ComponentProps<typeof DropdownMenu>
) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={
        <ToolbarButton pressed={open}>
          <PlusIcon />
        </ToolbarButton>
      } />
      <DropdownMenuContent>
        {groups.map(({ group, insert, items }) => (
          <ToolbarMenuGroup key={group} label={group}>
            {items.map(({ icon, label, value }) => (
              <DropdownMenuItem
                key={value}
                className='min-w-45'
                onClick={() => {
                  if (insert === 'inline') {
                    insertInlineElement(editor, value)
                  } else {
                    insertBlock(editor, value)
                  }
                  editor.tf.focus()
                }}
              >
                {icon}
                {label}
              </DropdownMenuItem>
            ))}
          </ToolbarMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
