'use client'

import { MoreHorizontalIcon } from '@hugeicons-pro/core-solid-rounded'
import {
  Archive03Icon,
  InternetIcon,
  Link04Icon,
  Logout01Icon,
  Settings01Icon,
  SquareLock02Icon,
  StarIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ProjectPicker } from '@/app/_components/workspace/project/issue/picker/project-picker'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { tabsTriggerClassName } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useProject } from '@/src/hooks/use-project'
import { useProjectActions } from '@/src/hooks/use-project-actions'
import type { ProjectDTO } from '@/types/project'

type ProjectTab = {
  label: string
  segment: string
  /** Hidden while the project has this feature switched off. */
  feature?: 'cyclesEnabled' | 'modulesEnabled'
  /** Shown but not linked until the section has a page. */
  comingSoon?: true
}

const PROJECT_TABS: readonly ProjectTab[] = [
  { label: 'Visão geral', segment: 'overview' },
  { label: 'Issues', segment: 'issues' },
  {
    label: 'Ciclos',
    segment: 'cycles',
    feature: 'cyclesEnabled',
    comingSoon: true,
  },
  {
    label: 'Módulos',
    segment: 'modules',
    feature: 'modulesEnabled',
    comingSoon: true,
  },
  { label: 'Visualizações', segment: 'views', comingSoon: true },
  { label: 'Páginas', segment: 'pages', comingSoon: true },
]

// The same look as the line <Tabs> (components/ui/tabs.tsx). These are links,
// not a tablist, so the active one is flagged with `data-active` for that
// styling and `aria-current` for assistive tech. The nav carries the
// `group/tabs` and `group/tabs-list` hooks the styles read. The underline
// sits on the bar's own bottom border instead of hanging below it.
const TAB_CLASS = cn(
  tabsTriggerClassName,
  'flex-none group-data-horizontal/tabs:after:bottom-[-5px]',
)

type ProjectTabsProps = {
  workspaceId: string
  workspaceSlug: string
  project: ProjectDTO
  /** Workspace admin or project lead: may publish and archive. */
  canManage: boolean
}

export function ProjectTabs({
  workspaceId,
  workspaceSlug,
  project: initialProject,
  canManage,
}: ProjectTabsProps) {
  const pathname = usePathname()
  const router = useRouter()
  // The server snapshot only seeds the render: favorite and visibility flip
  // in the query cache, so the menu labels must read from it.
  const { data: project = initialProject } = useProject(
    workspaceId,
    initialProject.slug,
  )
  const projectBase = `/${workspaceSlug}/projects/${project.slug}`
  const { toggleFavorite, togglePublic, copyLink, archive } = useProjectActions(
    workspaceId,
    projectBase,
    project,
  )

  const tabs = PROJECT_TABS.filter(
    (tab) => !tab.feature || project[tab.feature],
  )
  const isActive = (segment: string) => {
    const href = `${projectBase}/${segment}`
    // An issue page (`/issues/ALP-12`) still belongs to the Issues tab.
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  const currentSegment =
    tabs.find((tab) => !tab.comingSoon && isActive(tab.segment))?.segment ??
    'overview'

  async function archiveAndLeave() {
    // `replace`, not `push`: Back must not return to the archived project.
    if (await archive()) router.replace(`/${workspaceSlug}/projects`)
  }

  return (
    <div className='h-10 shrink-0 flex items-stretch gap-3 px-6 border-b border-secondary bg-app'>
      <div className='flex items-center gap-1'>
        <ProjectPicker
          workspaceId={workspaceId}
          value={project.slug}
          // Switching project keeps the tab the user is on.
          onChange={(nextSlug) =>
            router.push(
              `/${workspaceSlug}/projects/${nextSlug}/${currentSegment}`,
            )
          }
          buttonVariant='ghost'
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label={`Opções do projeto ${project.name}`}
              >
                <NexoIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              </Button>
            }
          />
          <DropdownMenuContent side='bottom' align='start' className='w-56'>
            <DropdownMenuItem
              onClick={() => router.push(`${projectBase}/settings`)}
            >
              <NexoIcon icon={Settings01Icon} strokeWidth={2} />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyLink}>
              <NexoIcon icon={Link04Icon} strokeWidth={2} />
              Copiar link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleFavorite}>
              <NexoIcon icon={StarIcon} strokeWidth={2} />
              {project.isFavorited
                ? 'Remover dos favoritos'
                : 'Adicionar aos favoritos'}
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem onClick={togglePublic}>
                <NexoIcon
                  icon={project.isPublic ? SquareLock02Icon : InternetIcon}
                  strokeWidth={2}
                />
                {project.isPublic ? 'Tornar privado' : 'Tornar público'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => router.push(`/${workspaceSlug}/archives`)}
            >
              <NexoIcon icon={Archive03Icon} strokeWidth={2} />
              Arquivados
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canManage && (
              <DropdownMenuItem onClick={archiveAndLeave}>
                <NexoIcon icon={Archive03Icon} strokeWidth={2} />
                Arquivar projeto
              </DropdownMenuItem>
            )}
            {/* ProjectService.removeMember only lets an admin or the lead
                remove members; leaving needs a self-removal rule first. */}
            <DropdownMenuItem variant='destructive' disabled>
              <NexoIcon icon={Logout01Icon} strokeWidth={2} />
              Sair do projeto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Route navigation, not Base UI <Tabs>: each tab is its own page, so
          these are links marked with aria-current, not a tablist. The picker
          and menu stay outside the <nav>, which holds only the sections. */}
      <nav
        aria-label='Seções do projeto'
        data-variant='line'
        data-orientation='horizontal'
        className='group/tabs group/tabs-list self-center h-8 flex items-center gap-1 text-muted-foreground'
      >
        {tabs.map((tab) =>
          tab.comingSoon ? (
            // Not a link: there is no page to land on yet. It keeps the tooltip
            // and the not-allowed cursor, so pointer events stay on.
            <span
              key={tab.segment}
              aria-disabled='true'
              title='Em breve'
              className={cn(
                TAB_CLASS,
                'cursor-not-allowed aria-disabled:pointer-events-auto group-data-[variant=line]/tabs-list:hover:bg-transparent group-data-[variant=line]/tabs-list:hover:after:opacity-0',
              )}
            >
              {tab.label}
            </span>
          ) : (
            <Link
              key={tab.segment}
              href={`${projectBase}/${tab.segment}`}
              aria-current={isActive(tab.segment) ? 'page' : undefined}
              data-active={isActive(tab.segment) ? '' : undefined}
              className={TAB_CLASS}
            >
              {tab.label}
            </Link>
          ),
        )}
      </nav>
    </div>
  )
}
