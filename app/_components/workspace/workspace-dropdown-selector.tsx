'use client'

import { AddCircleIcon, AddTeamIcon } from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUser } from '@/src/hooks/use-user'
import type { MembershipDTO } from '@/types/user'
import { WorkspaceDropdownCard } from './workspace-dropdown-card'
import { WorkspaceLogo } from './workspace-logo'

export function WorkspaceDropdownSelector({
  currentSlug,
}: {
  currentSlug: string
}) {
  const { push } = useRouter()
  const { data: user } = useUser()

  const memberships: MembershipDTO[] = user?.memberships ?? []
  const current = memberships.find((m) => m.slug === currentSlug)

  function handleSelect(slug: string) {
    if (slug !== currentSlug) push(`/${slug}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost'>
            <WorkspaceLogo
              name={current?.name ?? '?'}
              image={current?.image}
              className='size-6 rounded-sm text-xs'
            />
            {current?.name ?? 'Selecionar workspace'}
          </Button>
        }
      />
      <DropdownMenuContent className='w-max p-3 flex flex-col gap-y-2 rounded-md'>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled className='text-sm'>
            {user?.email}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {memberships.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuRadioGroup
              className='text-sm space-y-1'
              value={currentSlug}
              onValueChange={handleSelect}
            >
              {memberships.map((m) => (
                <WorkspaceDropdownCard key={m.workspaceId} membership={m} />
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem
            className='text-sm'
            render={<Link href='/create-workspace' />}
          >
            <NexoIcon icon={AddCircleIcon} />
            Criar workspace
          </DropdownMenuItem>
          <DropdownMenuItem
            className='text-sm'
            render={<Link href={`/${currentSlug}/settings/members`} />}
          >
            <NexoIcon icon={AddTeamIcon} />
            Convidar para workspace
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
