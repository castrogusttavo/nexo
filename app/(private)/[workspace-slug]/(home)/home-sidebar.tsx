import {
  KeyframesMultipleAddIcon,
  PanelLeftIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { io } from 'next/cache'
import { NavigationCustomizeDialog } from '@/app/_components/navigation/navigation-customize-dialog'
import {
  ContextHeader,
  ContextPrimaryAction,
  ContextSidebar,
} from '@/app/_components/navigation/sidebar-context'
import { ProjectSidebar } from '@/app/_components/workspace/project/project-sidebar'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { requireMembership } from '@/src/lib/dal'
import { DEFAULT_SIDEBAR_NAVIGATION } from '@/src/schemas/user-preference.schema'
import { isPrivilegedRole } from '@/src/services/_authz'
import { UserPreferenceService } from '@/src/services/user-preference.service'
import { HomeSidebarNavigation } from './home-sidebar-navigation'

export async function HomeSidebar({
  params,
}: {
  params: Promise<{ 'workspace-slug': string }>
}) {
  const { 'workspace-slug': slug } = await params
  const base = `/${slug}`

  // Session, consent (STR-61) and membership, checked here and not left to
  // the layouts above: layouts render in parallel, and whatever this one
  // renders reaches the RSC payload even when one of them redirects.
  const { user, membership } = await requireMembership(slug)

  // Below the DAL's private cache, a query that opens a pooled connection
  // draws random bytes (pg's SCRAM nonce), which a prerender refuses.
  await io()

  // Read on the server so a customised sidebar paints in its own order;
  // the client query takes over from there.
  const preferences = await UserPreferenceService.get(user.id)
  const navigation = preferences.ok
    ? preferences.value.navigation
    : DEFAULT_SIDEBAR_NAVIGATION

  // Who is looking decides which project actions the sidebar offers.

  const viewer = {
    workspaceId: membership.workspaceId,
    userId: user.id,
    isPrivileged: isPrivilegedRole(membership.role),
  }

  return (
    <ContextSidebar>
      <ContextHeader
        title='Projetos'
        actions={
          <>
            <NavigationCustomizeDialog />
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label='Recolher barra lateral'
            >
              <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            </Button>
          </>
        }
        primaryAction={
          <ContextPrimaryAction>
            <NexoIcon icon={KeyframesMultipleAddIcon} strokeWidth={2} />
            Nova issue
          </ContextPrimaryAction>
        }
      />
      <HomeSidebarNavigation base={base} initialNavigation={navigation} />
      <ProjectSidebar
        workspaceId={viewer.workspaceId}
        base={base}
        userId={viewer.userId}
        isPrivileged={viewer.isPrivileged}
      />
    </ContextSidebar>
  )
}
