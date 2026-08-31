'use client'

import {
  ChevronRightIcon,
  Columns3Icon,
  FileCodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  QuoteIcon,
  SquareIcon,
} from 'lucide-react'
import { KEYS, TElement } from "platejs"
import { useEditorRef, useSelectionFragmentProp } from 'platejs/react'
import React from 'react'
import { getBlockType, setBlockType } from '../editor/transforms'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioItem, DropdownMenuTrigger } from './dropdown-menu'
import { ToolbarButton, ToolbarMenuGroup } from './toolbar'

export const turnIntoItems = [
  { icon: <PilcrowIcon /> , keywords: ['paragraph'], label: 'Texto', value: KEYS.p },
  { icon: <Heading1Icon /> , keywords: ['título', 'h1'], label: 'Título 1', value: KEYS.h1 },
  { icon: <Heading2Icon /> , keywords: ['título', 'h2'], label: 'Título 2', value: KEYS.h2 },
  { icon: <Heading3Icon /> , keywords: ['título', 'h3'], label: 'Título 3', value: KEYS.h3 },
  { icon: <Heading4Icon /> , keywords: ['título', 'h4'], label: 'Título 4', value: KEYS.h4 },
  { icon: <Heading5Icon /> , keywords: ['título', 'h5'], label: 'Título 5', value: KEYS.h5 },
  { icon: <Heading6Icon /> , keywords: ['título', 'h6'], label: 'Título 6', value: KEYS.h6 },
  { icon: <ListIcon /> , keywords: ['lista', 'ul', '-'], label: 'Lista com marcadores', value: KEYS.ul },
  { icon: <ListOrderedIcon /> , keywords: ['lista', 'ol', '1'], label: 'Lista numera', value: KEYS.ol },
  { icon: <SquareIcon />, keywords: ['lista', 'checkbox', '[]'], label: 'Lista de tarefas', value: KEYS.listTodo },
  { icon: <ChevronRightIcon />, keywords: ['colapsavel', 'expensivel'], label: 'Lista alternável', value: KEYS.toggle },
  { icon: <FileCodeIcon /> , keywords: ['```'], label: 'Código', value: KEYS.codeBlock },
  { icon: <QuoteIcon /> , keywords: ['citacao', '>'], label: 'Citação', value: KEYS.blockquote },
  { icon: <Columns3Icon /> , keywords: ['colunas'], label: '3 colunas', value: 'action_three_columns' },
]

export function TurnIntoToolbarButton(
  props: React.ComponentProps<typeof DropdownMenu>
) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)

  const value = useSelectionFragmentProp({
    defaultValue: KEYS.p,
    getProp: (node) => getBlockType(node as TElement)
  })
  const selectedItem = React.useMemo(
    () =>
      turnIntoItems.find((item) => item.value === (value ?? KEYS.p)) ??
      turnIntoItems[0],
    [value]
  )

  return (
    <DropdownMenu open={open} onOpenChange={(next) => {
      setOpen(next)
      if (!next) editor.tf.focus()
    }} modal={false} {...props}>
      <DropdownMenuTrigger render={
        <ToolbarButton className='min-w-32' pressed={open} tooltip='Transformar em' isDropdown>
          {selectedItem.label}
        </ToolbarButton>
      } />
      <DropdownMenuContent
        className='ignore-click-outside/toolbar min-w-0'
        align='start'
      >
        <ToolbarMenuGroup
          value={value}
          onValueChange={(type) => setBlockType(editor, type)}
          label='Transformar em'
        >
          {turnIntoItems.map(({ icon, label, value: itemValue }) => (
            <DropdownMenuRadioItem
              key={itemValue}
              className='min-w-45 pl-2 *:first:[span]:hidden'
              value={itemValue}
            >
              {icon}
              {label}
            </DropdownMenuRadioItem>
          ))}
        </ToolbarMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
