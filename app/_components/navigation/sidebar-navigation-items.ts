import {
  Analytics01Icon,
  Archive03Icon,
  LayerMask01Icon,
  Layers01Icon,
  PencilEdit01Icon,
  PresentationLineChart01Icon,
  StickyNote02Icon,
  UserLove01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { NexoIcon } from '@/components/icon/icon'
import type {
  PersonalNavItem,
  WorkspaceNavItem,
} from '@/src/schemas/user-preference.schema'

type IconType = Parameters<typeof NexoIcon>[0]['icon']

export type SidebarNavItemMeta = { label: string; icon: IconType; path: string }

export const PERSONAL_NAV_ITEMS: Record<PersonalNavItem, SidebarNavItemMeta> = {
  drafts: { label: 'Rascunhos', icon: PencilEdit01Icon, path: '/drafts' },
  'your-work': {
    label: 'Seu trabalho',
    icon: UserLove01Icon,
    path: '/profile',
  },
  stickies: {
    label: 'Notas adesivas',
    icon: StickyNote02Icon,
    path: '/stickies',
  },
}

export const WORKSPACE_NAV_ITEMS: Record<WorkspaceNavItem, SidebarNavItemMeta> =
  {
    views: {
      label: 'Visualizações',
      icon: Layers01Icon,
      path: '/workspace-views',
    },
    cycles: { label: 'Ciclos', icon: LayerMask01Icon, path: '/active-cycles' },
    analytics: { label: 'Análises', icon: Analytics01Icon, path: '/analytics' },
    archives: { label: 'Arquivados', icon: Archive03Icon, path: '/archives' },
    dashboards: {
      label: 'Dashboards',
      icon: PresentationLineChart01Icon,
      path: '/dashboards',
    },
  }
