'use client'

import { SortByDown02Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useQueryStates } from 'nuqs'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { sortFieldParser, sortOrderParser } from '@/src/lib/project-params'

export function ProjectorderButton() {
  const [{ sortField, sortOrder }, setSort] = useQueryStates({
    sortField: sortFieldParser,
    sortOrder: sortOrderParser,
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='outline' size='xs'>
            <NexoIcon icon={SortByDown02Icon} strokeWidth={2} />
            {sortField === 'createdAt' ? 'Data de criação' : 'Nome'}
          </Button>
        }
      />
      <DropdownMenuContent className='w-44'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Campo</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortField}
            onValueChange={(v) => setSort({ sortField: v as typeof sortField })}
          >
            <DropdownMenuRadioItem value='name'>Nome</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='createdAt'>
              Data de criação
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Direção</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortOrder}
            onValueChange={(v) => setSort({ sortOrder: v as typeof sortOrder })}
          >
            <DropdownMenuRadioItem value='asc'>Crescente</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='desc'>
              Decrescente
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
