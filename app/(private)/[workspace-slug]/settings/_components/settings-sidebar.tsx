'use client'

import {
  AlarmClockIcon,
  ArrowDown03Icon,
  ArrowLeft02Icon,
  ArrowUp03Icon,
  BlockGameIcon,
  BoatIcon,
  Building02Icon,
  BulbIcon,
  CreditCardIcon,
  FullScreenIcon,
  GitMergeIcon,
  Key01Icon,
  SparklesIcon,
  StickyNote03Icon,
  UserMultipleIcon,
  WebhookIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { use } from 'react'
import {
  ContextSidebar,
  NavGroup,
  NavItem,
} from '@/app/_components/navigation/sidebar-context'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

export function SettingsSidebar({
  params,
}: {
  params: Promise<{ 'workspace-slug': string }>
}) {
  const { 'workspace-slug': slug } = use(params)
  const base = `/${slug}/settings`

  return (
    <ContextSidebar>
      <div className='flex gap-2 items-center'>
        <Button
          variant='secondary'
          size='icon-xs'
          onClick={() => history.back()}
        >
          <NexoIcon icon={ArrowLeft02Icon} strokeWidth={2} />
        </Button>
        <h3 className='text-base font-semibold'>Ajustes do Workspace</h3>
      </div>
      <NavGroup>
        <Muted className='font-medium py-2'>Administração</Muted>
        <NavItem href={base} icon={Building02Icon}>
          Geral
        </NavItem>
        <NavItem href={`${base}/members`} icon={UserMultipleIcon}>
          Membros
        </NavItem>
        <NavItem href={`${base}/billing`} icon={CreditCardIcon}>
          Assinatura e Planos
        </NavItem>
        <NavItem href={`${base}/imports`} icon={ArrowDown03Icon}>
          Importações
        </NavItem>
        <NavItem href={`${base}/exports`} icon={ArrowUp03Icon}>
          Exportações
        </NavItem>
        <NavItem href={`${base}/worklogs`} icon={AlarmClockIcon}>
          Worklogs
        </NavItem>
      </NavGroup>
      <NavGroup>
        <Muted className='font-medium py-2'>Recursos</Muted>
        <NavItem href={`${base}/products/wiki`} icon={StickyNote03Icon}>
          Wiki
        </NavItem>
        <NavItem href={`${base}/products/nexo-ai`} icon={SparklesIcon}>
          Nexo AI
        </NavItem>
      </NavGroup>
      <NavGroup>
        <Muted className='font-medium py-2'>Recursos</Muted>
        <NavItem
          href={`${base}/resources/project-configuration`}
          icon={FullScreenIcon}
        >
          Projetos
        </NavItem>
        <NavItem href={`${base}/resources/teamspaces`} icon={UserMultipleIcon}>
          Espaços de equipe
        </NavItem>
        <NavItem href={`${base}/resources/initiatives`} icon={BulbIcon}>
          Iniciativas
        </NavItem>
        <NavItem href={`${base}/resources/customers`} icon={BlockGameIcon}>
          Modelos
        </NavItem>
        <NavItem href={`${base}/resources/integrations`} icon={GitMergeIcon}>
          Integrações
        </NavItem>
        <NavItem href={`${base}/resources/releases`} icon={BoatIcon}>
          Lançamentos
        </NavItem>
      </NavGroup>
      <NavGroup>
        <Muted className='font-medium py-2'>Recursos</Muted>
        <NavItem href={`${base}/developers/webhooks`} icon={WebhookIcon}>
          Webhooks
        </NavItem>
        <NavItem href={`${base}/developers/api-tokens`} icon={Key01Icon}>
          Tokens de API
        </NavItem>
      </NavGroup>
    </ContextSidebar>
  )
}
