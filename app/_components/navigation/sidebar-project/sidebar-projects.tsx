'use client'

import {
  Add01Icon,
  Archive03Icon,
  InternetIcon,
  Link04Icon,
  Logout01Icon,
  MoreVerticalCircle01Icon,
  Settings01Icon,
  SquareLock02Icon,
  StarIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { usePathname, useRouter } from 'next/navigation'
import { NavGroupAccordion } from '@/app/_components/navigation/sidebar-context/navigation-sidebar-context-accordion'
import { WorkspaceProjectModal } from '@/app/_components/workspace/projects/modal/workspace-project-modal-create'
import { ProjectEmoji } from '@/app/_components/workspace/projects/workspace-project-emoji'
import { ButtonLink } from '@/components/button-link'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjects } from '@/src/hooks/use-project'
import { useProjectActions } from '@/src/hooks/use-project-actions'
import { useSidebarNavigation } from '@/src/hooks/use-user-preferences'
import type { ProjectDTO } from '@/types/project'

export function ProjectRow({
  project,
  base,
  workspaceId,
  canManage,
}: {
  project: ProjectDTO
  base: string
  workspaceId: string
  /** Workspace admin or project lead: may publish and archive. */
  canManage: boolean
}) {
  const projectBase = `${base}/projects/${project.slug}`
  const pathname = usePathname()
  const router = useRouter()
  const { toggleFavorite, togglePublic, copyLink, archive } = useProjectActions(
    workspaceId,
    projectBase,
    project,
  )

  // The row stands for every tab of the project, so it stays highlighted on
  // any of them. `true`, not `page`: the row is an ancestor of the current page.
  const isActive =
    pathname === projectBase || pathname.startsWith(`${projectBase}/`)

  async function archiveProject() {
    // Only leaves when the archived project is the one on screen.
    if ((await archive()) && isActive) router.replace(`${base}/projects`)
  }

  return (
    <div className='relative group/project-row'>
      <ButtonLink
        href={`${projectBase}/overview`}
        variant={isActive ? 'secondary' : 'ghost'}
        size='sm'
        aria-current={isActive ? 'true' : undefined}
        className='flex w-full h-9 px-2.5 justify-start gap-2 group-hover/project-row:bg-accent'
      >
        {project.emoji && (
          // Decorative: the link is named by the project, not by its icon
          // (an icon is stored as "Name:#color", which a reader would spell out).
          <span
            aria-hidden='true'
            className='size-4 shrink-0 grid place-items-center text-sm leading-none'
          >
            <ProjectEmoji value={project.emoji} size={14} />
          </span>
        )}
        <span className='flex-1 min-w-0 truncate text-sm font-medium'>
          {project.name}
        </span>
        {/* Holds the room the row menu is laid over, so a long name
            truncates before it instead of running underneath. */}
        <span aria-hidden='true' className='size-7 shrink-0' />
      </ButtonLink>
      {/* The row menu is a sibling of the link, not a child: a menu button
          inside an <a> is a control nested in a control. */}
      <div className='absolute top-0 right-1 h-9 flex items-center'>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Opções do projeto ${project.name}`}
            className='opacity-0 group-hover/project-row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 transition-opacity size-7 flex items-center justify-center rounded-md hover:bg-accent/80 shrink-0 outline-none'
          >
            <NexoIcon
              icon={MoreVerticalCircle01Icon}
              strokeWidth={2}
              size={10}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent side='bottom' align='end' className='w-56'>
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
            <DropdownMenuItem onClick={() => router.push(`${base}/archives`)}>
              <NexoIcon icon={Archive03Icon} strokeWidth={2} />
              Arquivados
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canManage && (
              <DropdownMenuItem onClick={archiveProject}>
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
    </div>
  )
}

export function SidebarProjects({
  workspaceId,
  base,
  userId,
  isPrivileged,
}: {
  workspaceId: string
  base: string
  userId: string
  /** Workspace OWNER/ADMIN — may manage a project they do not lead. */
  isPrivileged: boolean
}) {
  const { data: projects = [] } = useProjects(workspaceId)
  const { projectsLimit } = useSidebarNavigation()
  const favorites = projects.filter((p) => p.isFavorited)
  const others = projects.filter((p) => !p.isFavorited)
  // Favourites are never cut: the limit only trims the main list.
  const shown = projectsLimit === null ? others : others.slice(0, projectsLimit)

  return (
    <div className='space-y-1'>
      {favorites.length > 0 && (
        <NavGroupAccordion label='Favoritos' defaultOpen={false}>
          {favorites.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              base={base}
              workspaceId={workspaceId}
              canManage={isPrivileged || p.leadId === userId}
            />
          ))}
        </NavGroupAccordion>
      )}
      <NavGroupAccordion
        label='Projetos'
        defaultOpen
        action={
          <WorkspaceProjectModal
            workspaceId={workspaceId}
            trigger={
              <Button variant='ghost' size='icon-sm' aria-label='Novo projeto'>
                <NexoIcon icon={Add01Icon} strokeWidth={2} />
              </Button>
            }
          />
        }
      >
        {shown.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            base={base}
            workspaceId={workspaceId}
            canManage={isPrivileged || p.leadId === userId}
          />
        ))}
        {shown.length < others.length && (
          <ButtonLink
            href={`${base}/projects`}
            variant='ghost'
            size='sm'
            className='flex w-full justify-start text-muted-foreground'
          >
            Ver todos ({others.length})
          </ButtonLink>
        )}
      </NavGroupAccordion>
    </div>
  )
}
