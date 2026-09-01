'use client'

import * as React from 'react'
import type { PlateEditor, PlateElementProps } from 'platejs/react'
import {
  CalendarIcon,
  ChevronRightIcon,
  Code2,
  Columns3Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrdered,
  PenToolIcon,
  PilcrowIcon,
  Quote,
  RadicalIcon,
  Square,
  SuperscriptIcon,
  Table,
  TableOfContentsIcon,
} from 'lucide-react'
import { type TComboboxInputElement, KEYS } from 'platejs'
import { PlateElement } from 'platejs/react'
import { insertBlock, insertInlineElement } from '@/components/editor/transforms'
import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from './inline-combobox'

type Group = {
  group: string
  items: {
    icon: React.ReactNode
    value: string
    onSelect: (editor: PlateEditor, value: string) => void
    focusEditor?: boolean
    keywords?: string[]
    label?: string
  }[]
}

const groups: Group[] = [
  {
    group: 'Blocos básicos',
    items: [
      { icon: <PilcrowIcon />, keywords: ['paragrafo'], label: 'Texto', value: KEYS.p },
      { icon: <Heading1Icon />, keywords: ['titulo', 'h1'], label: 'Título 1', value: KEYS.h1 },
      { icon: <Heading2Icon />, keywords: ['titulo', 'h2'], label: 'Título 2', value: KEYS.h2 },
      { icon: <Heading3Icon />, keywords: ['titulo', 'h3'], label: 'Título 3', value: KEYS.h3 },
      { icon: <ListIcon />, keywords: ['lista', '-'], label: 'Lista com marcadores', value: KEYS.ul },
      { icon: <ListOrdered />, keywords: ['lista', '1'], label: 'Lista numerada', value: KEYS.ol },
      { icon: <Square />, keywords: ['checklist', 'tarefa', '[]'], label: 'Lista de tarefas', value: KEYS.listTodo },
      { icon: <ChevronRightIcon />, keywords: ['colapsavel'], label: 'Lista alternável', value: KEYS.toggle },
      { icon: <Code2 />, keywords: ['```'], label: 'Código', value: KEYS.codeBlock },
      { icon: <Table />, label: 'Tabela', value: KEYS.table },
      { icon: <Quote />, keywords: ['citacao', '>'], label: 'Citação', value: KEYS.blockquote },
    ].map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertBlock(editor, value, { upsert: true })
      },
    })),
  },
  {
    group: 'Blocos avançados',
    items: [
      { icon: <TableOfContentsIcon />, keywords: ['sumario'], label: 'Sumário', value: KEYS.toc },
      { icon: <Columns3Icon />, label: '3 colunas', value: 'action_three_columns' },
      { focusEditor: false, icon: <RadicalIcon />, label: 'Equação', value: KEYS.equation },
      { icon: <PenToolIcon />, keywords: ['desenho'], label: 'Excalidraw', value: KEYS.excalidraw },
      { icon: <Code2 />, keywords: ['diagrama', 'mermaid', 'flowchart'], label: 'Diagrama (mermaid)', value: KEYS.codeDrawing },
    ].map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertBlock(editor, value, { upsert: true })
      },
    })),
  },
  {
    group: 'Inline',
    items: [
      { focusEditor: true, icon: <CalendarIcon />, keywords: ['data'], label: 'Data', value: KEYS.date },
      { focusEditor: false, icon: <RadicalIcon />, label: 'Equação inline', value: KEYS.inlineEquation },
      { focusEditor: true, icon: <SuperscriptIcon />, keywords: ['citacao', 'nota'], label: 'Nota de rodapé', value: 'action_footnote' },
    ].map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertInlineElement(editor, value)
      },
    })),
  },
]

export function SlashInputElement(props: PlateElementProps<TComboboxInputElement>) {
  const { editor, element } = props

  return (
    <PlateElement {...props} as='span'>
      <InlineCombobox element={element} trigger='/'>
        <InlineComboboxInput />

        <InlineComboboxContent>
          <InlineComboboxEmpty>Nenhum resultado</InlineComboboxEmpty>

          {groups.map(({ group, items }) => (
            <InlineComboboxGroup key={group}>
              <InlineComboboxGroupLabel>{group}</InlineComboboxGroupLabel>

              {items.map(({ focusEditor, icon, keywords, label, value, onSelect }) => (
                <InlineComboboxItem
                  key={value}
                  value={value}
                  onClick={() => onSelect(editor, value)}
                  label={label}
                  focusEditor={focusEditor}
                  group={group}
                  keywords={keywords}
                >
                  <div className='mr-2 text-muted-foreground'>{icon}</div>
                  {label ?? value}
                </InlineComboboxItem>
              ))}
            </InlineComboboxGroup>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  )
}
