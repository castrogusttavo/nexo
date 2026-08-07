'use client'

import { Cancel01Icon } from "@hugeicons-pro/core-stroke-rounded"
import { NexoIcon } from "../icon/icon"
import { Button } from "../ui/button"
import { ButtonGroup } from "../ui/button-group"
import { FilterAdvanced } from "./filter-advanced"
import { useIssueFilters } from "./use-issue-filters"
import { FilterPql } from "./filter-pql"

interface FilterContainerProps {
  workspaceId: string
  projectSlug: string
  onClose: () => void
}

export function FilterContainer({ workspaceId, projectSlug, onClose }: FilterContainerProps) {
  const [{ mode, filters }, setFilters] = useIssueFilters()

  function handleModeChange(nextMode: 'basic' | 'pql') {
    setFilters({ mode: nextMode })
  }

  function handleClausesChange(clauses: typeof filters) {
    setFilters({ filters: clauses })
  }

  function handleClearAll() {
    setFilters({ filters: [] })
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
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
        <FilterAdvanced
          workspaceId={workspaceId}
          projectSlug={projectSlug}
          clauses={filters}
          onClausesChange={handleClausesChange}
        />
      ) : (
        <FilterPql />
      )}
      <div className='flex items-center gap-2'>
        <Button variant='ghost' size='sm' className='h-8' onClick={handleClearAll}>
          Limpar filtros
        </Button>
        <Button variant='ghost' size='icon' className='h-8 w-8' onClick={onClose}>
          <NexoIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>
    </div>
  )
}
