import {
  Building02Icon,
  CreditCardIcon,
  UserMultipleIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { ReactNode } from 'react'
import {
  ContextHeader,
  ContextSidebar,
  NavGroup,
  NavItem,
} from '@/app/_components/navigation/sidebar-context'

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
        <ContextHeader title='Ajustes do Workspace' />
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
        </NavGroup>
      </ContextSidebar>
      {children}
    </>
  )
}
