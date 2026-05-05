import {
  Home03Icon,
  PanelLeftIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  ContextHeader,
  ContextSidebar,
  NavGroup,
  NavItem,
} from '@/app/_components/navigation/context-sidebar-navigation'

export default function SettingsLayout({ children }: { children: ReactNode }) {
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
          <NavItem href='/' icon={Home03Icon}>
            Geral
          </NavItem>
          <NavItem href='/members' icon={Home03Icon}>
            Membros
          </NavItem>
          <NavItem href='/billing' icon={Home03Icon}>
            Assinatura e Planos
          </NavItem>
          <NavItem href='/imports' icon={Home03Icon}>
            Importações
          </NavItem>
          <NavItem href='/exports' icon={Home03Icon}>
            Exportações
          </NavItem>
          <NavItem href='/worklogs' icon={Home03Icon}>
            Registros de trabalho
          </NavItem>
        </NavGroup>
        <NavGroup>
          <NavItem href='/project-configuration' icon={Home03Icon}>
            Projetos
          </NavItem>
          <NavItem href='/integrations' icon={Home03Icon}>
            Integrações
          </NavItem>
          <NavItem href='/connections' icon={Home03Icon}>
            Conexões
          </NavItem>
          <NavItem href='/teamspaces' icon={Home03Icon}>
            Espaços de equipe
          </NavItem>
          <NavItem href='/initiatives' icon={Home03Icon}>
            Iniciativas
          </NavItem>
          <NavItem href='/templates' icon={Home03Icon}>
            Modelos
          </NavItem>
          <NavItem href='/nexo-intelligence' icon={Home03Icon}>
            Nexo IA
          </NavItem>
        </NavGroup>
      </ContextSidebar>
      {children}
    </>
  )
}
