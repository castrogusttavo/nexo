import {
  BlocksIcon,
  MountainIcon,
  Progress03Icon,
  Settings01Icon,
  StatusIcon,
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
        </NavGroup>
        <NavGroup>
          <Muted>Funcionalidades</Muted>
          <NavItem href={`${base}/features/cycles`} icon={Progress03Icon}>
            Ciclos
          </NavItem>
          <NavItem href={`${base}/features/modules`} icon={BlocksIcon}>
            Módulos
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
        </NavGroup>
      </ContextSidebar>
      {children}
    </>
  )
}
