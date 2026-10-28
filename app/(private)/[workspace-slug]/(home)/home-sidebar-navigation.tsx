'use client'

import {
  Home03Icon,
  MoreHorizontalIcon,
  WorkIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import {
  NavGroup,
  NavGroupAccordion,
  NavItem,
} from '@/app/_components/navigation/sidebar-context'
import {
  PERSONAL_NAV_ITEMS,
  type SidebarNavItemMeta,
  WORKSPACE_NAV_ITEMS,
} from '@/app/_components/navigation/sidebar-navigation-items'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebarNavigation } from '@/src/hooks/use-user-preferences'
import type { SidebarNavigation } from '@/src/schemas/user-preference.schema'

function SidebarMoreMenu({
  base,
  items,
}: {
  base: string
  items: SidebarNavItemMeta[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='sm'
            className='flex w-full justify-start text-muted-foreground'
          >
            <NexoIcon icon={MoreHorizontalIcon} strokeWidth={2} />
            Mais
          </Button>
        }
      />
      <DropdownMenuContent align='start' className='w-48'>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.path}
            render={<Link href={`${base}${item.path}`} />}
          >
            <NexoIcon icon={item.icon} strokeWidth={2} />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Home and Projects are fixed; everything else follows the user's
// navigation preference, and hidden items stay reachable under "Mais".
export function HomeSidebarNavigation({
  base,
  initialNavigation,
}: {
  base: string
  initialNavigation: SidebarNavigation
}) {
  const navigation = useSidebarNavigation(initialNavigation)

  const personal = navigation.personal.filter((i) => i.visible)
  const workspace = navigation.workspace.filter((i) => i.visible)
  const hidden = [
    ...navigation.personal
      .filter((i) => !i.visible)
      .map((i) => PERSONAL_NAV_ITEMS[i.id]),
    ...navigation.workspace
      .filter((i) => !i.visible)
      .map((i) => WORKSPACE_NAV_ITEMS[i.id]),
  ]

  return (
    <>
      <NavGroup>
        <NavItem href={base} icon={Home03Icon}>
          Página inicial
        </NavItem>
        {personal.map(({ id }) => {
          const item = PERSONAL_NAV_ITEMS[id]
          return (
            <NavItem key={id} href={`${base}${item.path}`} icon={item.icon}>
              {item.label}
            </NavItem>
          )
        })}
      </NavGroup>
      <NavGroupAccordion label='Espaço de trabalho' defaultOpen={true}>
        <NavItem href={`${base}/projects`} icon={WorkIcon}>
          Projetos
        </NavItem>
        {workspace.map(({ id }) => {
          const item = WORKSPACE_NAV_ITEMS[id]
          return (
            <NavItem key={id} href={`${base}${item.path}`} icon={item.icon}>
              {item.label}
            </NavItem>
          )
        })}
        {hidden.length > 0 && <SidebarMoreMenu base={base} items={hidden} />}
      </NavGroupAccordion>
    </>
  )
}
