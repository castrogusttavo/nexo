'use client'

import {
  GlobalIcon,
  InformationCircleIcon,
  SquareLock02Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { WorkspaceProjectCoverImagePicker } from '@/app/_components/workspace/projects/modal/workspace-project-cover-image-picker'
import { WorkspaceProjectEmojiIconPicker } from '@/app/_components/workspace/projects/modal/workspace-project-emoji-icon-picker'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { notify } from '@/lib/notify'
import {
  useArchiveProject,
  useDeleteProject,
  useUpdateProject,
} from '@/src/hooks/use-project'
import type { ProjectDTO } from '@/types/project'

interface ProjectGeneralSettingsFormProps {
  workspaceId: string
  workspaceSlug: string
  project: ProjectDTO
}

export function ProjectGeneralSettingsForm({
  workspaceId,
  workspaceSlug,
  project,
}: ProjectGeneralSettingsFormProps) {
  const router = useRouter()
  const projectSlug = project.slug
  const fieldId = useId()

  const updateProject = useUpdateProject(workspaceId, projectSlug)
  const archiveProject = useArchiveProject(workspaceId, projectSlug)
  const deleteProject = useDeleteProject(workspaceId, projectSlug)

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [identifier, setIdentifier] = useState(project.identifier ?? '')
  const [emoji, setEmoji] = useState(project.emoji ?? undefined)
  const [coverImage, setCoverImage] = useState(project.coverImage ?? undefined)
  const [isPublic, setIsPublic] = useState(project.isPublic ?? false)

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()

    const ok = await notify.run(
      updateProject.mutateAsync({
        name,
        description,
        identifier: identifier || undefined,
        emoji,
        coverImage,
        isPublic,
      }),
      {
        loading: 'Salvando projeto...',
        success: 'Projeto atualizado',
        error: 'Erro ao atualizar projeto',
      },
    )
    if (!ok) return
    router.refresh()
  }

  async function handleArchive() {
    const ok = await notify.run(archiveProject.mutateAsync(), {
      loading: 'Arquivando projeto...',
      success: 'Projeto arquivado',
      error: 'Erro ao arquivar projeto',
    })
    if (!ok) return
    router.push(`/${workspaceSlug}/projects`)
  }

  async function handleDelete() {
    const ok = await notify.run(deleteProject.mutateAsync(), {
      loading: 'Excluindo projeto...',
      success: 'Projeto excluído',
      error: 'Erro ao excluir projeto',
    })
    if (!ok) return
    // Replace so going back doesn't land on the deleted project's settings.
    router.replace(`/${workspaceSlug}/projects`)
  }

  return (
    <div className='py-9 w-full max-w-225 mx-auto'>
      <form key={project.id} className='w-full' onSubmit={handleSave}>
        <div className='group relative h-44 w-full rounded-lg bg-muted'>
          {coverImage && (
            <img
              src={coverImage}
              alt=''
              className='absolute inset-0 h-full w-full rounded-lg object-cover'
            />
          )}
          <div className='absolute inset-0 bg-linear-to-t from-black/50 to-transparent' />
          <div className='absolute right-2 bottom-2'>
            <WorkspaceProjectCoverImagePicker
              workspaceId={workspaceId}
              currentImage={coverImage}
              onSelect={setCoverImage}
            />
          </div>
          <div className='absolute flex gap-3 bottom-2 left-2'>
            <WorkspaceProjectEmojiIconPicker
              currentEmoji={emoji}
              onSelect={setEmoji}
            />
            <div className='space-y-1'>
              <div className='font-medium'>{project.name}</div>
              <div className='text-xs text-muted-foreground'>
                {project.identifier ?? '-'} ·{' '}
                {project.isPublic ? 'Público' : 'Privado'}
              </div>
            </div>
          </div>
        </div>
        <FieldGroup>
          <FieldSet className='mt-8 space-y-4'>
            <Field>
              <FieldLabel htmlFor={`${fieldId}-name`}>
                Nome do projeto
              </FieldLabel>
              <Input
                id={`${fieldId}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${fieldId}-description`}>
                Descrição
              </FieldLabel>
              <Textarea
                id={`${fieldId}-description`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className='min-h-26'
              />
            </Field>
            <FieldGroup className='grid grid-cols-2'>
              <Field className='col-span-1'>
                <FieldLabel htmlFor={`${fieldId}-identifier`}>
                  ID do projeto
                </FieldLabel>
                <InputGroup>
                  <Popover>
                    <InputGroupAddon>
                      <PopoverTrigger
                        render={
                          <InputGroupButton
                            variant='secondary'
                            size='icon-xs'
                            aria-label='Sobre o ID do projeto'
                          >
                            <NexoIcon
                              icon={InformationCircleIcon}
                              strokeWidth={2}
                            />
                          </InputGroupButton>
                        }
                      />
                    </InputGroupAddon>
                    <PopoverContent
                      // The popup is a role="dialog" and has no heading of
                      // its own, so it needs a name for screen readers.
                      aria-label='Sobre o ID do projeto'
                      align='start'
                      className='flex flex-col gap-1 rounded-xl text-sm'
                    >
                      <p className='font-medium text-xs'>
                        Ajuda você a identificar itens de trabalho no projeto de
                        forma exclusiva. Máximo de 50 caracteres.
                      </p>
                    </PopoverContent>
                  </Popover>
                  <InputGroupInput
                    id={`${fieldId}-identifier`}
                    value={identifier}
                    onChange={(e) =>
                      setIdentifier(e.target.value.toUpperCase())
                    }
                  />
                </InputGroup>
              </Field>
              <Field className='col-span-1'>
                <FieldLabel htmlFor={`${fieldId}-visibility`}>
                  Visibilidade
                </FieldLabel>
                <Select
                  value={isPublic ? 'public' : 'private'}
                  onValueChange={(value) => {
                    if (value) setIsPublic(value === 'public')
                  }}
                >
                  <SelectTrigger id={`${fieldId}-visibility`} size='sm'>
                    <SelectValue>
                      {isPublic ? (
                        <>
                          <NexoIcon icon={GlobalIcon} strokeWidth={2} />
                          Público
                        </>
                      ) : (
                        <>
                          <NexoIcon icon={SquareLock02Icon} strokeWidth={2} />
                          Privado
                        </>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      <SelectItem value='private'>
                        <NexoIcon icon={SquareLock02Icon} strokeWidth={2} />
                        <div className='flex flex-col'>
                          Privado
                          <span className='text-xs text-muted-foreground'>
                            Acessível apenas por convite
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value='public'>
                        <NexoIcon icon={GlobalIcon} strokeWidth={2} />
                        <div className='flex flex-col'>
                          Público
                          <span className='text-xs text-muted-foreground'>
                            Qualquer pessoa no workspace
                          </span>
                        </div>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FieldSet>
          <Field orientation='horizontal' className='justify-between'>
            <Button type='submit' size='sm' disabled={updateProject.isPending}>
              Atualizar projeto
            </Button>
            <Muted className='text-xs italic'>
              Criado em{' '}
              {new Date(project.createdAt).toLocaleDateString('pt-BR')}
            </Muted>
          </Field>
        </FieldGroup>
      </form>
      <Card className='mt-10 p-4 gap-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h4 className='text-sm font-medium'>Arquivar</h4>
            <p className='text-xs text-muted-foreground'>
              Arquivar um projeto irá removê-lo da sua navegação lateral, embora
              você ainda possa acessá-lo a partir da página de seus projetos.
              Você pode restaurar o projeto ou excluí-lo sempre que quiser.
            </p>
          </div>
          <ConfirmDialog
            trigger={
              <Button variant='outline' size='xs'>
                Arquivar
              </Button>
            }
            title='Arquivar o projeto'
            description='O projeto sai da navegação lateral, mas continua acessível pela página de projetos. Pode ser restaurado depois.'
            confirmLabel='Arquivar'
            pendingLabel='Arquivando...'
            pending={archiveProject.isPending}
            onConfirm={handleArchive}
          />
        </div>
        <div className='flex items-center justify-between'>
          <div>
            <h4 className='text-sm font-medium'>Excluir</h4>
            <p className='text-xs text-muted-foreground'>
              Ao excluir um projeto, todos os dados e recursos desse projeto
              serão removidos permanentemente e não poderão ser recuperados.
            </p>
          </div>
          <ConfirmDialog
            trigger={
              <Button variant='destructive' size='xs'>
                Excluir
              </Button>
            }
            title='Excluir projeto'
            description='Todos os dados e recursos desse projeto serão removidos permanentemente e não poderão ser recuperados.'
            confirmLabel='Excluir'
            pendingLabel='Excluindo...'
            destructive
            pending={deleteProject.isPending}
            onConfirm={handleDelete}
          />
        </div>
      </Card>
    </div>
  )
}
