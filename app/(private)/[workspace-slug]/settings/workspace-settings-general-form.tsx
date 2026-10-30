'use client'

import type { Role } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { type SyntheticEvent, useMemo, useState } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { notify } from '@/lib/notify'
import { useUpdateWorkspace, useWorkspace } from '@/src/hooks/use-workspace'
import { TEAM_SIZES } from '@/src/schemas/workspace.schema'
import type { WorkspaceDTO } from '@/types/workspace'
import { WorkspaceSettingsDeleteDialog } from './workspace-settings-delete-dialog'
import { WorkspaceSettingsLogoDialog } from './workspace-settings-logo-dialog'

export function WorkspaceSettingsGeneralForm({
  workspace: initialWorkspace,
  role,
}: {
  workspace: WorkspaceDTO
  role: Role
}) {
  const router = useRouter()
  // The server-rendered workspace is only the starting point. The page comes
  // from the data access layer, which the client router keeps for minutes, so
  // what the screen shows after a save or a logo change is this query.
  const { data: workspace } = useWorkspace(
    initialWorkspace.id,
    initialWorkspace,
  )
  const update = useUpdateWorkspace(workspace.id)
  const canEdit = role === 'OWNER' || role === 'ADMIN'

  const [logoOpen, setLogoOpen] = useState(false)
  const [name, setName] = useState(workspace.name)
  const [teamSize, setTeamSize] = useState(workspace.teamSize ?? '')
  const [timezone, setTimezone] = useState(workspace.timezone)

  const timezones = useMemo(() => {
    const all = Intl.supportedValuesOf('timeZone')
    return all.includes(workspace.timezone) ? all : [workspace.timezone, ...all]
  }, [workspace.timezone])

  const url = `nexopm.com/${workspace.slug}`
  // Same floor as CreateWorkspaceSchema, so the 422 never has to happen.
  const valid = name.trim().length >= 2
  const dirty =
    name !== workspace.name ||
    teamSize !== (workspace.teamSize ?? '') ||
    timezone !== workspace.timezone

  function copyLink() {
    navigator.clipboard.writeText(`https://${url}`)
    notify.success('Link copiado')
  }

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault()
    const ok = await notify.run(
      update.mutateAsync({
        name,
        timezone,
        ...(teamSize
          ? { teamSize: teamSize as (typeof TEAM_SIZES)[number] }
          : {}),
      }),
      {
        loading: 'Atualizando workspace...',
        success: 'Workspace atualizado',
        error: 'Não foi possível atualizar o workspace',
      },
    )
    // The DAL result is kept by the client router for 5 min.
    if (ok) router.refresh()
  }

  return (
    <div className='py-9 w-full max-w-200 mx-auto'>
      <div className='space-y-7'>
        <div className='flex items-center gap-5'>
          <WorkspaceSettingsLogoDialog
            workspace={workspace}
            canEdit={canEdit}
            open={logoOpen}
            onOpenChange={setLogoOpen}
          />
          <div className='flex flex-col items-start gap-0.5'>
            <div className='text-lg font-medium'>{workspace.name}</div>
            <button
              type='button'
              title='Copiar link'
              className='text-muted-foreground text-sm font-medium hover:text-primary transition-colors duration-100'
              onClick={copyLink}
            >
              {url}
            </button>
            {canEdit && (
              <Button
                type='button'
                variant='link'
                className='text-xs p-0 m-0 h-fit text-branding-500'
                onClick={() => setLogoOpen(true)}
              >
                Carregar logo
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <FieldSet disabled={!canEdit}>
            <FieldGroup className='grid w-full items-center justify-between gap-8 grid-cols-1 xl:grid-cols-2'>
              <Field className='gap-1.5'>
                <FieldLabel htmlFor='workspace-name'>
                  Nome do espaço de trabalho
                </FieldLabel>
                <Input
                  id='workspace-name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete='off'
                  minLength={2}
                  maxLength={100}
                  required
                />
              </Field>
              <Field className='gap-1.5'>
                <FieldLabel>Tamanho da empresa</FieldLabel>
                <Select
                  value={teamSize}
                  onValueChange={(v) => setTeamSize(v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Selecione' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TEAM_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className='gap-1.5'>
                <FieldLabel htmlFor='workspace-url'>
                  URL do espaço de trabalho
                </FieldLabel>
                <Input id='workspace-url' value={url} disabled readOnly />
              </Field>
              <Field className='gap-1.5'>
                <FieldLabel>Fuso horário do espaço de trabalho</FieldLabel>
                <Select
                  value={timezone}
                  onValueChange={(v) => v && setTimezone(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Button
                  type='submit'
                  size='sm'
                  className='w-fit!'
                  disabled={!canEdit || !dirty || !valid || update.isPending}
                >
                  Atualizar workspace
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </div>

      {role === 'OWNER' && (
        <div className='mt-10 w-full bg-app rounded-lg border border-border px-4 py-3 flex items-center gap-4 md:gap-8'>
          <div className='flex gap-1.5 flex-col'>
            <h5 className='text-base font-medium'>Excluir este workspace</h5>
            <Muted>
              Excluir este workspace apaga permanentemente todos os projetos,
              páginas e dados de todos os membros. Nada pode ser recuperado, nem
              mesmo por nós. Continue somente se tiver certeza.
            </Muted>
          </div>
          <WorkspaceSettingsDeleteDialog workspace={workspace} />
        </div>
      )}
    </div>
  )
}
