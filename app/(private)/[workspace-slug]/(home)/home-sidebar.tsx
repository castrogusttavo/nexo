import {
  Analytics01Icon,
  Archive03Icon,
  Home03Icon,
  KeyframesMultipleAddIcon,
  LayerMask01Icon,
  Layers01Icon,
  PanelLeftIcon,
  PencilEdit01Icon,
  PresentationLineChart01Icon,
  SlidersHorizontalIcon,
  StickyNote02Icon,
  UserLove01Icon,
  WorkIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import {
  ContextHeader,
  ContextPrimaryAction,
  ContextSidebar,
  NavGroup,
  NavGroupAccordion,
  NavItem,
} from '@/app/_components/navigation/sidebar-context'
import { SidebarProjects } from '@/app/_components/navigation/sidebar-project/sidebar-projects'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { requireMembership } from '@/src/lib/dal'
import { isPrivilegedRole } from '@/src/services/_authz'

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
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label='Opções de exibição'
            >
              <NexoIcon icon={SlidersHorizontalIcon} strokeWidth={2} />
            </Button>
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
      <NavGroup>
        <NavItem href={base} icon={Home03Icon}>
          Página inicial
        </NavItem>
        <NavItem href={`${base}/drafts`} icon={PencilEdit01Icon}>
          Rascunhos
        </NavItem>
        <NavItem href={`${base}/profile`} icon={UserLove01Icon}>
          Seu trabalho
        </NavItem>
        <NavItem href={`${base}/stickies`} icon={StickyNote02Icon}>
          Notas adesivas
        </NavItem>
      </NavGroup>
      <NavGroupAccordion label='Espaço de trabalho' defaultOpen={true}>
        <NavItem href={`${base}/projects`} icon={WorkIcon}>
          Projetos
        </NavItem>
        <NavItem href={`${base}/workspace-views`} icon={Layers01Icon}>
          Visualizações
        </NavItem>
        <NavItem href={`${base}/active-cycles`} icon={LayerMask01Icon}>
          Ciclos
        </NavItem>
        <NavItem href={`${base}/analytics`} icon={Analytics01Icon}>
          Análises
        </NavItem>
        <NavItem href={`${base}/archives`} icon={Archive03Icon}>
          Arquivados
        </NavItem>
        <NavItem href={`${base}/dashboards`} icon={PresentationLineChart01Icon}>
          Dashboards
        </NavItem>
      </NavGroupAccordion>
      <SidebarProjects
        workspaceId={viewer.workspaceId}
        base={base}
        userId={viewer.userId}
        isPrivileged={viewer.isPrivileged}
      />
    </ContextSidebar>
  )
}
