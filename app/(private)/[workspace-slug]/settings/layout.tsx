import {
  AlarmClockIcon,
  Building02Icon,
  BulbChargingIcon,
  ChartRelationshipIcon,
  CreditCardIcon,
  DashboardSquareAddIcon,
  Download01Icon,
  PackageIcon,
  PanelLeftIcon,
  Shapes01Icon,
  SparklesIcon,
  Upload01Icon,
  UserMultipleIcon,
  WorkIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { ReactNode } from 'react'
import {
  ContextHeader,
  ContextSidebar,
  NavGroup,
  NavItem,
} from '@/app/_components/navigation/context-sidebar-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string }>
}) {
  const { 'workspace-slug': slug } = await params
  const base = `/${slug}/settings`

  return (
    <>
      <ContextSidebar>
        <ContextHeader
          title='Ajustes do Workspace'
          actions={
            <Button variant='ghost' size='icon-sm'>
              <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            </Button>
          }
        />
        <NavGroup>
          <NavItem href={base} icon={Building02Icon}>
            Geral
          </NavItem>
          <NavItem href={`${base}/members`} icon={UserMultipleIcon}>
            Membros
          </NavItem>
          <NavItem href={`${base}/billing`} icon={CreditCardIcon}>
            Assinatura e Planos
          </NavItem>
          <NavItem href={`${base}/imports`} icon={Download01Icon}>
            Importações
          </NavItem>
          <NavItem href={`${base}/exports`} icon={Upload01Icon}>
            Exportações
          </NavItem>
          <NavItem href={`${base}/worklogs`} icon={AlarmClockIcon}>
            Registros de trabalho
          </NavItem>
        </NavGroup>
        <NavGroup>
          <NavItem href={`${base}/project-configuration`} icon={WorkIcon}>
            Projetos
          </NavItem>
          <NavItem href={`${base}/integrations`} icon={ChartRelationshipIcon}>
            Integrações
          </NavItem>
          <NavItem href={`${base}/connections`} icon={DashboardSquareAddIcon}>
            Conexões
          </NavItem>
          <NavItem href={`${base}/teamspaces`} icon={PackageIcon}>
            Espaços de equipe
          </NavItem>
          <NavItem href={`${base}/initiatives`} icon={BulbChargingIcon}>
            Iniciativas
          </NavItem>
          <NavItem href={`${base}/templates`} icon={Shapes01Icon}>
            Modelos
          </NavItem>
          <NavItem href={`${base}/nexo-intelligence`} icon={SparklesIcon}>
            Nexo IA
          </NavItem>
        </NavGroup>
      </ContextSidebar>
      {children}
    </>
  )
}
