'use client'

import * as React from 'react'
import { LineHeightPlugin } from '@platejs/basic-styles/react'
import { WrapText } from 'lucide-react'
import { useEditorRef, useSelectionFragmentProp } from 'platejs/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { ToolbarButton } from './toolbar'

export function LineHeightToolbarButton(
  props: React.ComponentProps<typeof DropdownMenu>
) {
  const editor = useEditorRef()
  const { defaultNodeValue, validNodeValues: values = [] } =
    editor.getInjectProps(LineHeightPlugin)

  const value = useSelectionFragmentProp({
    defaultValue: defaultNodeValue,
    getProp: (node) => node.lineHeight,
  })

  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton pressed={open} tooltip='Altura da linha' isDropdown>
            <WrapText />
          </ToolbarButton>
        }
      />

      <DropdownMenuContent className='min-w-0' align='start'>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(newValue) => {
            editor
              .getTransforms(LineHeightPlugin)
              .lineHeight.setNodes(Number(newValue))
            editor.tf.focus()
          }}
        >
          {values.map((value) => (
            <DropdownMenuRadioItem
              key={value}
              className='min-w-45 pl-2'
              value={value}
            >
              {value}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
