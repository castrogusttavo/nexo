import {
  Settings01Icon,
  UserAdd01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenuItem,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import type { MembershipDTO } from '@/types/user'

// A menu item styled as a small outline button. `py-0` drops the item's
// vertical padding, which would otherwise overflow the button's fixed `h-6`.
const actionClassName = buttonVariants({
  size: 'xs',
  variant: 'outline',
  className: 'py-0',
})

/**
 * One workspace in the switcher: a radio item that selects it, followed by its
 * settings and invite links as sibling menu items.
 *
 * The links used to live inside the radio item. A `menuitemradio` has
 * presentational children, so the links were a control inside a control:
 * unreachable by arrow keys and announced as part of the radio's name. Each
 * action is now its own item in the menu's roving focus, in DOM order right
 * after the workspace it belongs to. The wrapper only carries the checked
 * background, so the card still reads as one block.
 */
export function WorkspaceDropdownCard({
  membership,
}: {
  membership: MembershipDTO
}) {
  const initial = membership.name.charAt(0).toUpperCase()
  const roleLabel =
    membership.role.charAt(0) + membership.role.slice(1).toLowerCase()

  return (
    <div className='flex flex-col items-start gap-y-2.5 rounded-sm pb-1.5 has-data-checked:bg-accent'>
      <DropdownMenuRadioItem value={membership.slug} className='w-full'>
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
      </DropdownMenuRadioItem>
      <div className='flex gap-2 px-2'>
        <DropdownMenuItem
          aria-label={`Configurações de ${membership.name}`}
          className={actionClassName}
          render={<Link href={`/${membership.slug}/settings`} />}
        >
          <NexoIcon icon={Settings01Icon} />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem
          aria-label={`Convidar membros para ${membership.name}`}
          className={actionClassName}
          render={<Link href={`/${membership.slug}/settings/members`} />}
        >
          <NexoIcon icon={UserAdd01Icon} />
          Convidar membros
        </DropdownMenuItem>
      </div>
    </div>
  )
}
