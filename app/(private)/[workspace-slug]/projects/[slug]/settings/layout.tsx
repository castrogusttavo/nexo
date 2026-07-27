import { ZapIcon } from '@hugeicons-pro/core-solid-rounded'
import {
  ArchiveArrowDownIcon,
  BlocksIcon,
  DiamondIcon,
  EnergyEllipseIcon,
  File02Icon,
  FlowSquareIcon,
  GeometricShapes01Icon,
  KeyframesMultipleIcon,
  Layers01Icon,
  MountainIcon,
  Progress03Icon,
  Settings01Icon,
  StatusIcon,
  StopWatchIcon,
  Tag01Icon,
  UserMultipleIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  ContextHeader,
  ContextSidebar,
  NavGroup,
  NavItem,
} from '@/app/_components/navigation/sidebar-context'
import { Muted } from '@/components/typography/text/muted'
import { getProjectContext } from '@/src/lib/project-context'

export default async function ProjectSettingsLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string; slug: string }>
}) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  const context = await getProjectContext(workspaceSlug, slug)
  if (!context) notFound()

  const base = `/${workspaceSlug}/projects/${slug}/settings`

  return (
    <>
      <ContextSidebar>
        <ContextHeader title={`Configurações · ${context.project.name}`} />
        <NavGroup>
          <Muted>Geral</Muted>
          <NavItem href={base} icon={Settings01Icon}>
            Geral
          </NavItem>
          <NavItem href={`${base}/members`} icon={UserMultipleIcon}>
            Membros
          </NavItem>
          <NavItem href={`${base}/worklogs`} icon={StopWatchIcon}>
            Registros de trabalho
          </NavItem>
        </NavGroup>
        <NavGroup>
          <Muted>Funcionalidades</Muted>
          <NavItem href={`${base}/features/cycles`} icon={Progress03Icon}>
            Ciclos
          </NavItem>
          <NavItem href={`${base}/features/modules`} icon={BlocksIcon}>
            Módulos
          </NavItem>
          <NavItem href={`${base}/features/views`} icon={Layers01Icon}>
            Visualizações
          </NavItem>
          <NavItem href={`${base}/features/pages`} icon={File02Icon}>
            Páginas
          </NavItem>
          <NavItem href={`${base}/features/intake`} icon={ArchiveArrowDownIcon}>
            Recepção
          </NavItem>
          <NavItem href={`${base}/features/time-tracking`} icon={StopWatchIcon}>
            Rastreamento de tempo
          </NavItem>
          <NavItem href={`${base}/features/milestones`} icon={DiamondIcon}>
            Marcos
          </NavItem>
          <NavItem
            href={`${base}/features/project-updates`}
            icon={EnergyEllipseIcon}
          >
            Atualizações do projeto
          </NavItem>
        </NavGroup>
        <NavGroup>
          <Muted>Estrutura de trabalho</Muted>
          <NavItem href={`${base}/states`} icon={StatusIcon}>
            Estados
          </NavItem>
          <NavItem href={`${base}/labels`} icon={Tag01Icon}>
            Etiquetas
          </NavItem>
          <NavItem href={`${base}/estimates`} icon={MountainIcon}>
            Estimativas
          </NavItem>
          <NavItem
            href={`${base}/work-item-types`}
            icon={KeyframesMultipleIcon}
          >
            Tipos de item de trabalho
          </NavItem>
          <NavItem href={`${base}/templates`} icon={GeometricShapes01Icon}>
            Modelos
          </NavItem>
        </NavGroup>
        <NavGroup>
          <Muted>Execução</Muted>
          <NavItem href={`${base}/workflows`} icon={FlowSquareIcon}>
            Fluxos de trablho
          </NavItem>
          <NavItem href={`${base}/automations`} icon={ZapIcon}>
            Automações
          </NavItem>
          <NavItem
            href={`${base}/recurring-work-items`}
            icon={KeyframesMultipleIcon}
          >
            Issues recorrentes
          </NavItem>
        </NavGroup>
      </ContextSidebar>
      {children}
    </>
  )
}
