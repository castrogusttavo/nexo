'use client'

import { Cancel01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useMemo, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { useIssues } from '@/src/hooks/use-issue'
import { Combobox } from '../../ui/combobox'

type IconType = Parameters<typeof NexoIcon>[0]['icon']

export type IssueLinkTypeOption<TType extends string> = {
  value: TType
  label: string
  icon: IconType
  strokeWidth?: number
}

type IssueLink = { id: string; targetId: string }

interface IssueLinkPickerProps<TType extends string, TLink extends IssueLink> {
  workspaceId: string
  projectSlug: string
  issueId: string
  links: TLink[]
  /** The types offered when adding a link. */
  typeOptions: IssueLinkTypeOption<TType>[]
  /** How an existing link reads from this issue's side. */
  describe: (link: TLink) => IssueLinkTypeOption<string> | undefined
  /** e.g. "Remover relação"; names each remove button. */
  removeLabel: string
  adding: boolean
  onAdd: (type: TType, targetId: string) => void
  onRemove: (linkId: string) => void
}

// The shared body of the relations and dependencies pickers: the links this
// issue has, each removable, and a type + issue pair to add another.
export function IssueLinkPicker<TType extends string, TLink extends IssueLink>({
  workspaceId,
  projectSlug,
  issueId,
  links,
  typeOptions,
  describe,
  removeLabel,
  adding,
  onAdd,
  onRemove,
}: IssueLinkPickerProps<TType, TLink>) {
  const { data: issues } = useIssues(workspaceId, projectSlug)

  const [pendingType, setPendingType] = useState<TType | undefined>(undefined)
  const [pendingTargetId, setPendingTargetId] = useState<string | undefined>(
    undefined,
  )

  const issuesById = useMemo(
    () => new Map((issues ?? []).map((issue) => [issue.id, issue])),
    [issues],
  )
  const issueOptions = (issues ?? []).filter((issue) => issue.id !== issueId)
  const selectedType = typeOptions.find((t) => t.value === pendingType)
  const pendingTarget = pendingTargetId
    ? issuesById.get(pendingTargetId)
    : undefined

  function handleAdd() {
    if (!pendingType || !pendingTargetId) return
    onAdd(pendingType, pendingTargetId)
    setPendingType(undefined)
    setPendingTargetId(undefined)
  }

  return (
    <div className='flex flex-col gap-2'>
      {links.map((link) => {
        const target = issuesById.get(link.targetId)
        const type = describe(link)
        return (
          <div
            key={link.id}
            className='flex items-center justify-between gap-2 text-sm'
          >
            <span className='flex items-center gap-1.5'>
              {type && (
                <NexoIcon
                  icon={type.icon}
                  strokeWidth={type.strokeWidth ?? 2}
                />
              )}
              {type?.label}{' '}
              {target ? `#${target.number} ${target.title}` : link.targetId}
            </span>
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              aria-label={removeLabel}
              onClick={() => onRemove(link.id)}
            >
              <NexoIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </div>
        )
      })}

      <div className='flex items-center gap-2'>
        <Combobox
          options={typeOptions}
          getValue={(option) => option.value}
          getSearchText={(option) => option.label}
          value={pendingType}
          onChange={(type) => setPendingType(type as TType)}
          emptyMessage='Nenhum resultado.'
          contentClassName='w-48'
          trigger={
            <Button variant='outline' size='sm' className='h-8'>
              {selectedType ? <IssueLinkType option={selectedType} /> : 'Tipo'}
            </Button>
          }
          renderItem={(option) => <IssueLinkType option={option} />}
        />
        <Combobox
          options={issueOptions}
          getValue={(issue) => issue.id}
          getSearchText={(issue) => `${issue.number} ${issue.title}`}
          value={pendingTargetId}
          onChange={setPendingTargetId}
          emptyMessage='Nenhum resultado.'
          contentClassName='w-64'
          trigger={
            <Button variant='outline' size='sm' className='h-8'>
              {pendingTarget
                ? `#${pendingTarget.number} ${pendingTarget.title}`
                : 'Issue'}
            </Button>
          }
          renderItem={(issue) => `#${issue.number} ${issue.title}`}
        />
        <Button
          variant='outline'
          size='sm'
          className='h-8'
          disabled={!pendingType || !pendingTargetId || adding}
          onClick={handleAdd}
        >
          Adicionar
        </Button>
      </div>
    </div>
  )
}

function IssueLinkType({ option }: { option: IssueLinkTypeOption<string> }) {
  return (
    <span className='flex items-center gap-1.5'>
      <NexoIcon icon={option.icon} strokeWidth={option.strokeWidth ?? 2} />
      {option.label}
    </span>
  )
}
