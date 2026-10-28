'use client'

import { Cancel01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { unsupportedIssueFilters } from './apply-issue-filters'
import { IssueFilterAdvanced } from './issue-filter-advanced'
import { IssueFilterPql } from './issue-filter-pql'
import { useIssueFilters } from './use-issue-filters'

interface IssueFilterContainerProps {
  workspaceId: string
  projectSlug: string
  onClose: () => void
}

export function IssueFilterContainer({
  workspaceId,
  projectSlug,
  onClose,
}: IssueFilterContainerProps) {
  const [{ mode, filters, pql }, setFilters] = useIssueFilters()
  const unsupported = unsupportedIssueFilters({ mode, filters, pql })

  function handleModeChange(nextMode: 'basic' | 'pql') {
    setFilters({ mode: nextMode })
  }

  function handleClausesChange(clauses: typeof filters) {
    setFilters({ filters: clauses })
  }

  function handleClearAll() {
    setFilters({ filters: [], pql: '' })
  }

  return (
    <div className='flex flex-col gap-3 p-3'>
      <ButtonGroup>
        <Button
          variant={mode === 'basic' ? 'secondary' : 'outline'}
          size='sm'
          className='h-8'
          onClick={() => handleModeChange('basic')}
        >
          Básico
        </Button>
        <Button
          variant={mode === 'pql' ? 'secondary' : 'outline'}
          size='sm'
          className='h-8'
          onClick={() => handleModeChange('pql')}
        >
          PQL
        </Button>
      </ButtonGroup>
      {mode === 'basic' ? (
        <IssueFilterAdvanced
          workspaceId={workspaceId}
          projectSlug={projectSlug}
          clauses={filters}
          onClausesChange={handleClausesChange}
        />
      ) : (
        <IssueFilterPql />
      )}
      {unsupported.length > 0 ? (
        <p role='status' className='text-muted-foreground text-xs'>
          Estes filtros ainda não são suportados e foram ignorados:{' '}
          {unsupported.join(', ')}.
        </p>
      ) : null}
      <div className='flex items-center gap-2'>
        <Button
          variant='ghost'
          size='sm'
          className='h-8'
          onClick={handleClearAll}
        >
          Limpar filtros
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          aria-label='Fechar filtros'
          onClick={onClose}
        >
          <NexoIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>
    </div>
  )
}
