'use client'

import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PROJECT_UPDATE_HEALTH,
  type ProjectUpdateHealth,
} from '../../_lib/project-update-health'

type ProjectUpdateHealthPickerProps = {
  value: ProjectUpdateHealth
  onChange: (value: ProjectUpdateHealth) => void
}

export function ProjectUpdateHealthPicker({
  value,
  onChange,
}: ProjectUpdateHealthPickerProps) {
  const [open, setOpen] = useState(false)
  const current = PROJECT_UPDATE_HEALTH[value]

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant='outline' size='xs'>
            <NexoIcon icon={current.icon} className={current.text} />
            {current.label}
          </Button>
        }
      />
      <DropdownMenuContent className='min-w-auto w-auto max-w-auto'>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            onChange(next as ProjectUpdateHealth)
            setOpen(false)
          }}
        >
          {(
            Object.entries(PROJECT_UPDATE_HEALTH) as [
              ProjectUpdateHealth,
              (typeof PROJECT_UPDATE_HEALTH)[ProjectUpdateHealth],
            ][]
          ).map(([key, item]) => (
            <DropdownMenuRadioItem key={key} value={key} className='group'>
              <NexoIcon icon={item.icon} className={item.text} />
              <Muted className='group-hover:text-primary'>{item.label}</Muted>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
