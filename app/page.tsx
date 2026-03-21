'use client'

import { ThreeDScaleIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspace,
} from '@/src/hooks/use-workspace'
import { useUser } from '@/src/hooks/use-user'
import { authClient } from '@/src/lib/auth-client'
import { NexoIcon } from './_components/icon/icon'

export default function RootPage() {
  const router = useRouter()
  const { data: user } = useUser()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/sign-in')
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen gap-6 p-8'>
      <h1 className='text-2xl font-bold'>Nexo — Workspace Test</h1>

      <div className='flex flex-col gap-6 w-full max-w-md'>
        <CreateWorkspaceCard />
        {user?.workspaceId && (
          <WorkspaceDetailsCard workspaceId={user.workspaceId} />
        )}
      </div>

      <Button variant='outline' onClick={handleSignOut}>
        <NexoIcon icon={ThreeDScaleIcon} />
        Sair
      </Button>
    </div>
  )
}

function CreateWorkspaceCard() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const createWorkspace = useCreateWorkspace()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createWorkspace.mutate(
      { name, slug },
      {
        onSuccess: () => {
          toast.success('Workspace criado!')
          setName('')
          setSlug('')
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Workspace</CardTitle>
        <CardDescription>Preencha os campos para criar um novo workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='name'>Nome</Label>
            <Input
              id='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Meu Workspace'
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='slug'>Slug</Label>
            <Input
              id='slug'
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder='meu-workspace'
            />
          </div>
          <Button type='submit' disabled={createWorkspace.isPending}>
            {createWorkspace.isPending ? 'Criando...' : 'Criar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function WorkspaceDetailsCard({ workspaceId }: { workspaceId: string }) {
  const { data: workspace, isLoading } = useWorkspace(workspaceId)
  const updateWorkspace = useUpdateWorkspace(workspaceId)
  const deleteWorkspace = useDeleteWorkspace(workspaceId)
  const [editName, setEditName] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  if (isLoading) return <p className='text-muted-foreground text-sm'>Carregando workspace...</p>
  if (!workspace) return null

  function handleUpdate(e: FormEvent) {
    e.preventDefault()
    updateWorkspace.mutate(
      { name: editName },
      {
        onSuccess: () => {
          toast.success('Workspace atualizado!')
          setIsEditing(false)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleDelete() {
    deleteWorkspace.mutate(undefined, {
      onSuccess: () => toast.success('Workspace deletado!'),
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Atual</CardTitle>
        <CardDescription>{workspace.slug}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex flex-col gap-1 text-sm'>
          <p><span className='text-muted-foreground'>Nome:</span> {workspace.name}</p>
          <p><span className='text-muted-foreground'>Plano:</span> {workspace.activePlan}</p>
          <p><span className='text-muted-foreground'>Criado em:</span> {new Date(workspace.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate} className='flex flex-col gap-3'>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='edit-name'>Novo nome</Label>
              <Input
                id='edit-name'
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder='Novo nome'
              />
            </div>
            <div className='flex gap-2'>
              <Button type='submit' disabled={updateWorkspace.isPending}>
                {updateWorkspace.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type='button' variant='outline' onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setEditName(workspace.name)
                setIsEditing(true)
              }}
            >
              Editar
            </Button>
            <Button
              variant='destructive'
              onClick={handleDelete}
              disabled={deleteWorkspace.isPending}
            >
              {deleteWorkspace.isPending ? 'Deletando...' : 'Deletar'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
