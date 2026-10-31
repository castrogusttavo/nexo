'use client'

import { Add01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useMemo, useState } from 'react'
import { projectStateGroups } from '@/app/_components/workspace/project/project-state-groups'
import { NexoIcon } from '@/components/icon/icon'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { notify } from '@/lib/notify'
import { colorToText } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import {
  useDeleteProjectState,
  useProjectStates,
  useSetDefaultProjectState,
} from '@/src/hooks/use-project-state'
import type {
  ProjectStateDTO,
  ProjectStateGroupDTO,
} from '@/types/project-state'
import { WorkspaceSettingsProjectStateForm } from './workspace-settings-project-state-form'
import { WorkspaceSettingsProjectStateRow } from './workspace-settings-project-state-row'

type FormTarget =
  | { mode: 'create'; group: ProjectStateGroupDTO }
  | { mode: 'edit'; state: ProjectStateDTO }

export function WorkspaceSettingsProjectStatesList({
  workspaceId,
  canConfigure,
}: {
  workspaceId: string
  canConfigure: boolean
}) {
  const { data: states, isLoading, isError } = useProjectStates(workspaceId)
  const setDefault = useSetDefaultProjectState(workspaceId)
  const deleteState = useDeleteProjectState(workspaceId)

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<ProjectStateGroupDTO, ProjectStateDTO[]>()
    for (const { group } of projectStateGroups) map.set(group, [])
    for (const state of states ?? []) map.get(state.group)?.push(state)
    for (const list of map.values()) list.sort((a, b) => a.order - b.order)
    return map
  }, [states])

  function isFormOpenFor(group: ProjectStateGroupDTO) {
    if (!formTarget) return false
    return formTarget.mode === 'create'
      ? formTarget.group === group
      : formTarget.state.group === group
  }

  function handleSetDefault(stateId: string) {
    notify.run(setDefault.mutateAsync(stateId), {
      loading: 'Definindo padrão...',
      success: 'Estado definido como padrão',
      error: 'Não foi possível definir o estado padrão',
    })
  }

  function handleDelete(stateId: string) {
    notify.run(deleteState.mutateAsync(stateId), {
      loading: 'Excluindo estado...',
      success: ({ count }) =>
        count > 0
          ? `Estado excluído. ${count} ${count === 1 ? 'projeto foi movido' : 'projetos foram movidos'} para outro estado do grupo`
          : 'Estado excluído',
      error: 'Não foi possível excluir o estado',
    })
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {projectStateGroups.map(({ group }) => (
          <Card key={group} className='p-3 rounded-lg'>
            <CardContent className='p-0 h-fit space-y-2'>
              <div className='flex items-center gap-1.5'>
                <Skeleton className='size-4 rounded-full' />
                <Skeleton className='h-4 w-24' />
              </div>
              <Skeleton className='h-10 w-full rounded-lg' />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p role='alert' className='text-sm text-destructive'>
        Não foi possível carregar os estados dos projetos.
      </p>
    )
  }

  return (
    <div className='space-y-4'>
      {projectStateGroups.map((meta) => {
        const groupStates = grouped.get(meta.group) ?? []

        return (
          <Card key={meta.group} className='p-3 rounded-lg'>
            <CardContent className='p-0 h-fit'>
              <Accordion defaultValue={[meta.group]}>
                <AccordionItem value={meta.group}>
                  {/* The add button can't live inside the trigger (a button
                      in a button), so it sits beside the trigger's chevron. */}
                  <div className='relative'>
                    <AccordionTrigger className='p-0 w-full min-h-8 flex items-center gap-1.5 hover:no-underline!'>
                      <div className='flex items-center gap-1.5'>
                        <NexoIcon
                          icon={meta.icon}
                          strokeWidth={meta.strokeWidth}
                          className={cn(colorToText(meta.defaultColor))}
                        />
                        {meta.label}
                      </div>
                    </AccordionTrigger>
                    {canConfigure && (
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        className='absolute top-1/2 right-5.5 -translate-y-1/2 text-muted-foreground'
                        aria-label={`Adicionar estado em ${meta.label}`}
                        onClick={() =>
                          setFormTarget({ mode: 'create', group: meta.group })
                        }
                      >
                        <NexoIcon icon={Add01Icon} strokeWidth={2} />
                      </Button>
                    )}
                  </div>
                  <AccordionContent className='mt-2.5 space-y-1.5 p-0'>
                    {formTarget && isFormOpenFor(meta.group) && (
                      <WorkspaceSettingsProjectStateForm
                        key={
                          formTarget.mode === 'edit'
                            ? formTarget.state.id
                            : `create-${meta.group}`
                        }
                        workspaceId={workspaceId}
                        onClose={() => setFormTarget(null)}
                        group={
                          formTarget.mode === 'create'
                            ? formTarget.group
                            : undefined
                        }
                        state={
                          formTarget.mode === 'edit'
                            ? formTarget.state
                            : undefined
                        }
                      />
                    )}
                    {groupStates.map((state) => (
                      <WorkspaceSettingsProjectStateRow
                        key={state.id}
                        state={state}
                        icon={meta.icon}
                        strokeWidth={meta.strokeWidth}
                        canConfigure={canConfigure}
                        onlyInGroup={groupStates.length === 1}
                        settingDefault={setDefault.isPending}
                        deleting={deleteState.isPending}
                        onEdit={() => setFormTarget({ mode: 'edit', state })}
                        onSetDefault={() => handleSetDefault(state.id)}
                        onDelete={() => handleDelete(state.id)}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
