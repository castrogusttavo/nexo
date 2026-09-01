'use client'

import * as React from 'react'
import { EllipsisIcon, KeyboardIcon, SubscriptIcon, SuperscriptIcon } from 'lucide-react'
import { KEYS } from 'platejs'
import { useMarkToolbarButton, useMarkToolbarButtonState } from 'platejs/react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu'
import { ToolbarButton } from './toolbar'

const EXTRA_MARKS = [
  { icon: <KeyboardIcon />, label: 'Atalho de teclado', nodeType: KEYS.kbd },
  { icon: <SuperscriptIcon />, label: 'Sobrescrito', nodeType: 'superscript' },
  { icon: <SubscriptIcon />, label: 'Subscrito', nodeType: 'subscript' },
]

export function ExtraToolbarButton(props: React.ComponentProps<typeof ToolbarButton>) {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton {...props} pressed={open} tooltip='Mais' isDropdown>
            <EllipsisIcon />
          </ToolbarButton>
        }
      />
      <DropdownMenuContent align='start' className='flex flex-col gap-0.5 p-1'>
        {EXTRA_MARKS.map(({ icon, label, nodeType }) => (
          <ExtraMarkItem key={nodeType} icon={icon} label={label} nodeType={nodeType} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ExtraMarkItem({ icon, label, nodeType }: { icon: React.ReactNode; label: string; nodeType: string }) {
  const state = useMarkToolbarButtonState({ nodeType })
  const { props: buttonProps } = useMarkToolbarButton(state)

  return (
    <ToolbarButton {...buttonProps} className='w-full justify-start gap-2 px-2'>
      {icon}
      {label}
    </ToolbarButton>
  )
}
