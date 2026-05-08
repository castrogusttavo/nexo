import {
  Analytics01Icon,
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
import type { ReactNode } from 'react'
import {
  ContextHeader,
  ContextPrimaryAction,
  ContextSidebar,
  NavGroup,
  NavItem,
} from '@/app/_components/navigation/sidebar-context'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'

export default async function HomeLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string }>
}) {
  const { 'workspace-slug': slug } = await params
  const base = `/${slug}`

  return (
    <>
      <ContextSidebar>
        <ContextHeader
          title='Projetos'
          actions={
            <>
              <Button variant='ghost' size='icon-sm'>
                <NexoIcon icon={SlidersHorizontalIcon} strokeWidth={2} />
              </Button>
              <Button variant='ghost' size='icon-sm'>
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
        <NavGroup>
          <NavItem href={`${base}/projects`} icon={WorkIcon}>
            Projetos
          </NavItem>
          <NavItem href={`${base}/active-cycles`} icon={LayerMask01Icon}>
            Ciclos
          </NavItem>
          <NavItem href={`${base}/workspace-views`} icon={Layers01Icon}>
            Visualizações
          </NavItem>
          <NavItem href={`${base}/analytics`} icon={Analytics01Icon}>
            Análises
          </NavItem>
          <NavItem
            href={`${base}/dashboards`}
            icon={PresentationLineChart01Icon}
          >
            Dashboards
          </NavItem>
        </NavGroup>
      </ContextSidebar>
      {children}
    </>
  )
}
