'use client'

import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { useIssues } from '@/src/hooks/use-issue'
import { Combobox } from '../../ui/combobox'
import { issueParentIcon } from '../issue-icons'

interface ParentPickerProps {
  workspaceId: string
  projectSlug: string
  excludeIssueId?: string
  value: string | undefined
  onChange: (issue: { id: string; number: number; title: string }) => void
}

export function ParentPicker({
  workspaceId,
  projectSlug,
  excludeIssueId,
  value,
  onChange,
}: ParentPickerProps) {
  const { data: issues } = useIssues(workspaceId, projectSlug)
  const options = (issues ?? []).filter((issue) => issue.id !== excludeIssueId)
  const selected = options.find((issue) => issue.id === value)

  return (
    <Combobox
      options={options}
      getValue={(issue) => issue.id}
      getSearchText={(issue) => `${issue.number} ${issue.title}`}
      value={value}
      onChange={(issueId) => {
        const issue = options.find((o) => o.id === issueId)
        if (issue)
          onChange({ id: issue.id, number: issue.number, title: issue.title })
      }}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-64'
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          <NexoIcon icon={issueParentIcon} strokeWidth={2} />
          {selected ? `#${selected.number} ${selected.title}` : 'Adicionar pai'}
        </Button>
      }
      renderItem={(issue) => `#${issue.number} ${issue.title}`}
    />
  )
}
