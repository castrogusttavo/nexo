import {
  Settings01Icon,
  UserAdd01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { buttonVariants } from '@/components/ui/button'
import { DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import type { MembershipDTO } from '@/types/user'

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
      <div className='flex flex-col items-start justify-center gap-y-4'>
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
