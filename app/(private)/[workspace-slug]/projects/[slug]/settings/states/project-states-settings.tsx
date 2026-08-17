'use client'

import {
  Add01Icon,
  Delete02Icon,
  PencilEdit01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useMemo, useState } from 'react'
import { issueStatesIcon } from '@/app/_components/issue/issue-icons'
import { NexoIcon } from '@/components/icon/icon'
import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { notify } from '@/lib/notify'
import { colorToText, STATE_GROUP_DEFAULT_COLOR } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import {
  useDeleteState,
  useSetDefaultState,
  useStates,
} from '@/src/hooks/use-state'
import type { StateDTO, StateGroupDTO } from '@/types/state'
import { StateForm } from './state-form'

type FormTarget =
  | { mode: 'create'; group: StateGroupDTO }
  | { mode: 'edit'; state: StateDTO }

interface ProjectStatesSettingsProps {
  workspaceId: string
  projectSlug: string
}

export function ProjectStatesSettings({
  workspaceId,
  projectSlug,
}: ProjectStatesSettingsProps) {
  const { data: states, isLoading } = useStates(workspaceId, projectSlug)
  const setDefaultState = useSetDefaultState(workspaceId, projectSlug)
  const deleteState = useDeleteState(workspaceId, projectSlug)

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<StateGroupDTO, StateDTO[]>()
    for (const group of issueStatesIcon) map.set(group.state, [])
    for (const state of states ?? []) map.get(state.group)?.push(state)
    for (const list of map.values()) list.sort((a, b) => a.order - b.order)
    return map
  }, [states])

  function isFormOpenForGroup(group: StateGroupDTO) {
    if (!formTarget) return false
    return formTarget.mode === 'create'
      ? formTarget.group === group
      : formTarget.state.group === group
  }

  function handleSetDefault(stateId: string) {
    notify.mutate(setDefaultState.mutateAsync(stateId), {
      loading: 'Definindo padrão...',
      success: 'State definido como padrão',
      error: 'Erro ao definir state padrão',
    })
  }

  function handleDelete(stateId: string) {
    notify.mutate(deleteState.mutateAsync(stateId), {
      loading: 'Excluindo state...',
      success: 'State excluído',
      error: 'Erro ao excluir state',
    })
  }

  return (
    <div className='py-9 w-full max-w-225 mx-auto'>
      <H3>Estados</H3>
      <Muted>
        Defina e personalize os estados de fluxo de trabalho para acompanhar o
        progresso das suas issues.
      </Muted>
      {isLoading ? (
        <div className='mt-6 space-y-4'>
          {issueStatesIcon.map((group) => (
            <Card key={group.state} className='p-3 rounded-lg'>
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
      ) : (
        <div className='mt-6 space-y-4'>
          {issueStatesIcon.map((group) => {
            const groupStates = grouped.get(group.state) ?? []
            const formOpen = isFormOpenForGroup(group.state)

            return (
              <Card key={group.state} className='p-3 rounded-lg'>
                <CardContent className='p-0 h-fit'>
                  <Accordion defaultValue={[group.state]}>
                    <AccordionItem value={group.state}>
                      <AccordionTrigger className='p-0 flex items-center gap-1.5 hover:no-underline!'>
                        <div className='w-full flex items-center justify-between'>
                          <div className='flex items-center gap-1.5'>
                            <NexoIcon
                              icon={group.icon}
                              strokeWidth={group.strokeWidth}
                              className={cn(
                                colorToText(
                                  STATE_GROUP_DEFAULT_COLOR[group.state],
                                ),
                              )}
                            />
                            {group.label}
                          </div>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            className='text-muted-foreground'
                            onClick={(e) => {
                              e.stopPropagation()
                              setFormTarget({
                                mode: 'create',
                                group: group.state,
                              })
                            }}
                          >
                            <NexoIcon icon={Add01Icon} strokeWidth={2} />
                          </Button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className='mt-2.5 space-y-1.5 p-0'>
                        {formOpen && formTarget && (
                          <StateForm
                            key={
                              formTarget.mode === 'edit'
                                ? formTarget.state.id
                                : `create-${group.state}`
                            }
                            workspaceId={workspaceId}
                            projectSlug={projectSlug}
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
                          <div
                            key={state.id}
                            className='h-12 group bg-accent/25 border border-border p-3 rounded-lg w-full flex items-center justify-between'
                          >
                            <div className='flex items-center gap-1.5'>
                              <NexoIcon
                                icon={group.icon}
                                strokeWidth={group.strokeWidth}
                                className={cn(colorToText(state.color))}
                              />
                              {state.name}
                            </div>
                            <div className='hidden group-hover:flex items-center text-center gap-1.5 text-muted-foreground'>
                              {state.isDefault ? (
                                <Muted className='text-xs px-2 m-0!'>
                                  Padrão
                                </Muted>
                              ) : (
                                <Button
                                  variant='ghost'
                                  size='xs'
                                  disabled={setDefaultState.isPending}
                                  onClick={() => handleSetDefault(state.id)}
                                >
                                  Marcar como padrão
                                </Button>
                              )}
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() =>
                                  setFormTarget({ mode: 'edit', state })
                                }
                              >
                                <NexoIcon
                                  icon={PencilEdit01Icon}
                                  strokeWidth={2}
                                />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger
                                  render={
                                    <Button variant='ghost' size='icon-sm'>
                                      <NexoIcon
                                        icon={Delete02Icon}
                                        strokeWidth={2}
                                      />
                                    </Button>
                                  }
                                />
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    Excluir state
                                  </AlertDialogHeader>
                                  <AlertDialogDescription>
                                    Itens de trabalho neste state precisarão ser
                                    movidos manualmente. Essa ação não pode ser
                                    desfeita.
                                  </AlertDialogDescription>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      variant='destructive'
                                      onClick={() => handleDelete(state.id)}
                                      disabled={deleteState.isPending}
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
