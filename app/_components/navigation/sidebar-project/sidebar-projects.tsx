'use client'

import {
  Add01Icon,
  Archive01Icon,
  Layers01Icon,
  Link01Icon,
  MoreVerticalCircle01Icon,
  Settings01Icon,
  StarIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useRouter } from 'next/navigation'
import { NavItem } from '@/app/_components/navigation/sidebar-context'
import { NavGroupAccordion } from '@/app/_components/navigation/sidebar-context/navigation-sidebar-context-accordion'
import { WorkspaceProjectModal } from '@/app/_components/workspace/projects/modal/workspace-project-modal-create'
import { NexoIcon } from '@/components/icon/icon'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { notify } from '@/lib/notify'
import {
  useArchiveProject,
  useFavoriteProject,
  useProjects,
  useUnfavoriteProject,
} from '@/src/hooks/use-project'
import type { ProjectDTO } from '@/types/project'

const PROJECT_NAV_ITEMS = [
  { label: 'Visão geral', segment: '/overview' },
  { label: 'Issues', segment: '/issues' },
] as const

function ProjectAccordion({
  project,
  base,
  workspaceId,
}: {
  project: ProjectDTO
  base: string
  workspaceId: string
}) {
  const projectBase = `${base}/projects/${project.slug}`
  const router = useRouter()
  const favorite = useFavoriteProject(workspaceId)
  const unfavorite = useUnfavoriteProject(workspaceId)
  const archive = useArchiveProject(workspaceId, project.slug)

  function toggleFavorite() {
    if (project.isFavorited) {
      unfavorite.mutate(project.slug, { onError: notify.error })
    } else {
      favorite.mutate(project.slug, { onError: notify.error })
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}${projectBase}`)
  }

  return (
    <Accordion defaultValue={[]}>
      <AccordionItem value={project.slug} className='border-b-0'>
        <div className='relative group/project-row'>
          <AccordionTrigger
            className='h-9 py-0 px-2.5 items-center hover:no-underline hover:bg-accent group-hover/project-row:bg-accent rounded-md font-normal text-sm'
            render={
              <Button variant='ghost' size='sm' className='w-full'>
                <div className='flex items-center gap-2 flex-1 min-w-0'>
                  <span className='truncate text-sm font-medium'>
                    {project.emoji ? `${project.emoji} ` : ''}
                    {project.name}
                  </span>
                </div>
                {/* Holds the room the row menu is laid over, so the chevron
                    and the row's intrinsic width stay where they were. */}
                <span aria-hidden='true' className='size-7 shrink-0' />
              </Button>
            }
          />
          {/* The row menu is a sibling of the accordion trigger, not a child:
              a menu button inside the trigger's <button> is a control nested
              in a control. It sits where it did when nested: left of the
              chevron, past the 1px border, px-2.5, the size-4 icon and the
              trigger's gap-1. */}
          <div className='absolute top-0 right-[31px] h-9 flex items-center'>
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
              <DropdownMenuContent side='bottom' align='end' className='w-full'>
                <DropdownMenuItem onClick={toggleFavorite}>
                  <NexoIcon icon={StarIcon} strokeWidth={2} />
                  {project.isFavorited
                    ? 'Remover dos favoritos'
                    : 'Adicionar aos favoritos'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyLink}>
                  <NexoIcon icon={Link01Icon} strokeWidth={2} />
                  Copiar link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    archive.mutate(undefined, {
                      onSuccess: () => notify.success('Projeto arquivado'),
                      onError: notify.error,
                    })
                  }
                >
                  <NexoIcon icon={Archive01Icon} strokeWidth={2} />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`${projectBase}/settings`)}
                >
                  <NexoIcon icon={Settings01Icon} strokeWidth={2} />
                  Configurações
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <AccordionContent className='pb-0 pl-3 space-y-px [&_a]:no-underline'>
          {PROJECT_NAV_ITEMS.map((item) => (
            <NavItem
              key={item.segment || 'overview'}
              href={`${projectBase}${item.segment}`}
              icon={Layers01Icon}
            >
              {item.label}
            </NavItem>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export function SidebarProjects({
  workspaceId,
  base,
}: {
  workspaceId: string
  base: string
}) {
  const { data: projects = [] } = useProjects(workspaceId)
  const favorites = projects.filter((p) => p.isFavorited)

  return (
    <div className='space-y-1'>
      {favorites.length > 0 && (
        <NavGroupAccordion label='Favoritos' defaultOpen={false}>
          {favorites.map((p) => (
            <ProjectAccordion
              key={p.id}
              project={p}
              base={base}
              workspaceId={workspaceId}
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
        {projects
          .filter((p) => !p.isFavorited)
          .map((p) => (
            <ProjectAccordion
              key={p.id}
              project={p}
              base={base}
              workspaceId={workspaceId}
            />
          ))}
      </NavGroupAccordion>
    </div>
  )
}
