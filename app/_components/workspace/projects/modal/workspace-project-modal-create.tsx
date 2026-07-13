'use client'

import {
  GlobalIcon,
  InformationCircleIcon,
  SquareLock02Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { COVER_IMAGES } from '@/app/_components/media/cover-images'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldGroup } from '@/components/ui/field'
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
import { Textarea } from '@/components/ui/textarea'
import { notify } from '@/lib/notify'
import { useCreateProject } from '@/src/hooks/use-project'
import { ProjectCreateButton } from '../workspace-project-create-button'
import { CoverImagePicker } from './workspace-project-modal-coverimage-dialog'
import { EmojiIconPicker } from './workspace-project-modal-emoji-icon-dialog'

function randomCoverImage() {
  return COVER_IMAGES[Math.floor(Math.random() * COVER_IMAGES.length)]
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

interface WorkspaceProjectModalProps {
  workspaceId: string
  trigger?: React.ReactElement
  nativeButton?: boolean
}

export function WorkspaceProjectModal({
  workspaceId,
  trigger,
  nativeButton = true,
}: WorkspaceProjectModalProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('😊')
  const [coverImage, setCoverImage] = useState<string>(() => randomCoverImage())
  const [isPublic, setIsPublic] = useState(false)

  const createProject = useCreateProject(workspaceId)

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setName(value)
    setSlug(toSlug(value))
  }

  function handleClose() {
    setOpen(false)
    setName('')
    setSlug('')
    setDescription('')
    setEmoji('😊')
    setCoverImage(randomCoverImage())
    setIsPublic(false)
    createProject.reset()
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    try {
      await createProject.mutateAsync({
        name,
        slug,
        description: description || undefined,
        emoji,
        coverImage: coverImage ?? undefined,
        isPublic,
      })
      notify.success('Projeto criado')
      handleClose()
    } catch (err) {
      notify.error(err)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
        else setOpen(true)
      }}
    >
      <DialogTrigger
        nativeButton={nativeButton}
        render={
          trigger ?? (
            <ProjectCreateButton
              variant='default'
              size='xs'
              label='Adicionar projeto'
            />
          )
        }
      />
      <DialogContent className='p-3 w-full sm:max-w-4xl'>
        <form onSubmit={handleSubmit}>
          <div className='group relative h-44 w-full rounded-lg bg-muted'>
            <img
              className='object-cover absolute left-0 top-0 h-full w-full rounded-lg'
              src={coverImage}
              alt=''
            />
            <DialogClose className='absolute right-2 top-2 p-2' />
            <div className='absolute right-2 bottom-2'>
              <CoverImagePicker
                workspaceId={workspaceId}
                currentImage={coverImage ?? undefined}
                onSelect={setCoverImage}
              />
            </div>
            <div className='absolute -bottom-5 left-3'>
              <EmojiIconPicker currentEmoji={emoji} onSelect={setEmoji} />
            </div>
          </div>
          <div className='px-3 mt-9 space-y-6'>
            <FieldGroup>
              <div className='grid grid-cols-4 gap-4'>
                <Field className='col-span-3'>
                  <Input
                    id='name'
                    type='text'
                    placeholder='Nome do projeto'
                    value={name}
                    onChange={handleNameChange}
                    required
                  />
                </Field>
                <Field className='col-span-1'>
                  <InputGroup>
                    <Popover>
                      <InputGroupAddon>
                        <PopoverTrigger
                          render={
                            <InputGroupButton
                              variant='secondary'
                              size='icon-xs'
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
                        align='start'
                        className='flex flex-col gap-1 rounded-xl text-sm'
                      >
                        <p className='font-medium text-xs'>
                          Ajuda você a identificar itens de trabalho no projeto
                          de forma exclusiva. Máximo de 50 caracteres.
                        </p>
                      </PopoverContent>
                    </Popover>
                    <InputGroupInput
                      id='slug'
                      type='text'
                      placeholder='ID do projeto'
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                    />
                  </InputGroup>
                </Field>
              </div>
              <Field>
                <Textarea
                  id='description'
                  placeholder='Descrição'
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant='outline' size='sm' />}
                >
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
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-auto'>
                  <DropdownMenuGroup>
                    <DropdownMenuRadioGroup
                      value={isPublic ? 'public' : 'private'}
                      onValueChange={(v) => setIsPublic(v === 'public')}
                    >
                      <DropdownMenuRadioItem value='private'>
                        <NexoIcon icon={SquareLock02Icon} strokeWidth={2} />
                        <div className='flex flex-col'>
                          Privado
                          <span className='text-xs text-muted-foreground'>
                            Acessível apenas por convite
                          </span>
                        </div>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value='public'>
                        <NexoIcon icon={GlobalIcon} strokeWidth={2} />
                        <div className='flex flex-col'>
                          Público
                          <span className='text-xs text-muted-foreground'>
                            Qualquer pessoa no workspace
                          </span>
                        </div>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {createProject.isError && (
            <p className='px-3 text-xs text-destructive'>
              {createProject.error?.message}
            </p>
          )}
          <div className='w-full border border-border' />
          <div className='flex justify-end gap-2'>
            <DialogClose
              render={
                <Button
                  variant='outline'
                  size='sm'
                  type='button'
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
              }
            />
            <Button
              size='sm'
              type='submit'
              disabled={createProject.isPending || !name || !slug}
            >
              {createProject.isPending ? 'Criando...' : 'Criar projeto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
