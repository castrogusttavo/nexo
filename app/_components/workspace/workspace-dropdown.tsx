'use client'

import {
  AddCircleIcon,
  AddTeamIcon,
  Logout05Icon,
  Settings01Icon,
  UserAdd01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NexoIcon } from '@/components/icon/icon'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUser } from '@/src/hooks/use-user'
import { authClient } from '@/src/lib/auth-client'
import type { MembershipDTO } from '@/types/user'

export function WorkSpaceDropdown({ currentSlug }: { currentSlug: string }) {
  const router = useRouter()
  const { data: user } = useUser()

  const memberships: MembershipDTO[] = user?.memberships ?? []
  const current = memberships.find((m) => m.slug === currentSlug)
  const initial = (current?.name ?? '?').charAt(0).toUpperCase()

  function handleSelect(slug: string) {
    if (slug !== currentSlug) router.push(`/${slug}`)
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/sign-in')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost'>
            <div className='size-6 flex items-center justify-center rounded-sm bg-blue-400 text-xs font-semibold text-white'>
              {initial}
            </div>
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
          <DropdownMenuItem
            variant='destructive'
            className='text-sm'
            onClick={handleSignOut}
          >
            <NexoIcon icon={Logout05Icon} />
            Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function WorkspaceDropdownCard({
  membership,
}: {
  membership: MembershipDTO
}) {
  const initial = membership.name.charAt(0).toUpperCase()
  const roleLabel =
    membership.role.charAt(0) + membership.role.slice(1).toLowerCase()

  return (
    <DropdownMenuRadioItem
      value={membership.slug}
      className='data-checked:bg-accent'
    >
      <div className='flex flex-col items-start justify-center space-y-4'>
        <div className='w-full flex gap-1.5 items-center'>
          <div className='size-6 flex items-center justify-center rounded-sm bg-blue-400 text-xs font-semibold text-white'>
            {initial}
          </div>
          <div className='w-max'>
            <p>{membership.name}</p>
            <div className='text-xs text-muted-foreground flex gap-2 capitalize w-fit'>
              <span>{roleLabel}</span>
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <Link
            href={`/${membership.slug}/settings`}
            className={buttonVariants({ size: 'xs', variant: 'outline' })}
          >
            <NexoIcon icon={Settings01Icon} />
            Configurações
          </Link>
          <Link
            href={`/${membership.slug}/settings/members`}
            className={buttonVariants({ size: 'xs', variant: 'outline' })}
          >
            <NexoIcon icon={UserAdd01Icon} />
            Convidar membros
          </Link>
        </div>
      </div>
    </DropdownMenuRadioItem>
  )
}
