'use client'

import {
  GlobalIcon,
  InformationCircleIcon,
  SquareLock02Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CoverImagePicker } from '@/app/_components/workspace/projects/modal/workspace-project-modal-coverimage-dialog'
import { EmojiIconPicker } from '@/app/_components/workspace/projects/modal/workspace-project-modal-emoji-icon-dialog'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
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

    try {
      await notify.mutate(
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
      router.refresh()
    } catch {
      //
    }
  }

  async function handleArchive() {
    try {
      await notify.mutate(archiveProject.mutateAsync(), {
        loading: 'Arquivando projeto...',
        success: 'Projeto arquivado',
        error: 'Erro ao arquivar projeto',
      })
      router.push(`/${workspaceSlug}/projects`)
    } catch {
      //
    }
  }

  async function handleDelete() {
    try {
      await notify.mutate(archiveProject.mutateAsync(), {
        loading: 'Excluindo projeto...',
        success: 'Projeto excluído',
        error: 'Erro ao excluir projeto',
      })
      router.push(`/${workspaceSlug}/projects`)
    } catch {
      //
    }
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
            <CoverImagePicker
              workspaceId={workspaceId}
              currentImage={coverImage}
              onSelect={setCoverImage}
            />
          </div>
          <div className='absolute flex gap-3 bottom-2 left-2'>
            <EmojiIconPicker currentEmoji={emoji} onSelect={setEmoji} />
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
              <FieldLabel>Nome do projeto</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Descrição</FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className='min-h-26'
              />
            </Field>
            <FieldGroup className='grid grid-cols-2'>
              <Field className='col-span-1'>
                <FieldLabel>ID do projeto</FieldLabel>
                <InputGroup>
                  <Popover>
                    <InputGroupAddon>
                      <PopoverTrigger
                        render={
                          <InputGroupButton variant='secondary' size='icon-xs'>
                            <NexoIcon
                              icon={InformationCircleIcon}
                              strokeWidth={2}
                            />
                          </InputGroupButton>
                        }
                      />
                    </InputGroupAddon>
                    <PopoverContent
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
                    value={identifier}
                    onChange={(e) =>
                      setIdentifier(e.target.value.toUpperCase())
                    }
                  />
                </InputGroup>
              </Field>
              <Field className='col-span-1'>
                <FieldLabel>Visibilidade</FieldLabel>
                <Select
                  value={isPublic ? 'public' : 'private'}
                  onValueChange={(value) => {
                    if (value) setIsPublic(value === 'public')
                  }}
                >
                  <SelectTrigger size='sm'>
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
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant='outline' size='xs'>
                  Arquivar
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>Arquivar o projeto</AlertDialogHeader>
              <AlertDialogDescription>
                O projeto sai da navegação lateral, mas continua acessível pela
                página de projetos. Pode ser restaurado depois.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={archiveProject.isPending}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleArchive}
                  disabled={archiveProject.isPending}
                >
                  {archiveProject.isPending ? 'Arquivando...' : 'Arquivar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className='flex items-center justify-between'>
          <div>
            <h4 className='text-sm font-medium'>Excluir</h4>
            <p className='text-xs text-muted-foreground'>
              Ao excluir um projeto, todos os dados e recursos desse projeto
              serão removidos permanentemente e não poderão ser recuperados.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant='destructive' size='xs'>
                  Excluir
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>Excluir projeto</AlertDialogHeader>
              <AlertDialogDescription>
                Todos os dados e recursos desse projeto serõ removidos
                permanentemente e não poderão ser recuperados.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteProject.isPending}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  variant='destructive'
                  onClick={handleDelete}
                  disabled={deleteProject.isPending}
                >
                  {deleteProject.isPending ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  )
}
