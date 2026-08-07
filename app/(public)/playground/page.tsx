'use client'

import {
  Calendar04Icon,
  LayoutTwoColumnIcon,
  Menu01Icon,
  TableIcon,
  TimelineListIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { FilterContainer } from '@/components/filters/filter-container'
import { NexoIcon } from '@/components/icon/icon'
import {
  LayoutOptions,
  OptionButton,
} from '@/components/layouts/layout-options'
import { Button } from '@/components/ui/button'

const WORKSPACE_ID = ''
const PROJECT_SLUG = ''

export default function PlaygroundPage() {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <>
      <h1>Playground</h1>
      <LayoutOptions>
        <OptionButton content='Layout de lista'>
          <NexoIcon strokeWidth={2} icon={Menu01Icon} />
        </OptionButton>
        <OptionButton content='Layout de kanban'>
          <NexoIcon strokeWidth={2} icon={LayoutTwoColumnIcon} />
        </OptionButton>
        <OptionButton content='Layout de calendário'>
          <NexoIcon strokeWidth={2} icon={Calendar04Icon} />
        </OptionButton>
        <OptionButton content='Layout de tabela'>
          <NexoIcon strokeWidth={2} icon={TableIcon} />
        </OptionButton>
        <OptionButton content='Layout de cronograma'>
          <NexoIcon strokeWidth={2} icon={TimelineListIcon} />
        </OptionButton>
      </LayoutOptions>

      {showFilters ? (
        <FilterContainer
          workspaceId={WORKSPACE_ID}
          projectSlug={PROJECT_SLUG}
          onClose={() => setShowFilters(false)}
        />
      ) : (
        <Button
          variant='outline'
          size='sm'
          className='h-8 w-fit'
          onClick={() => setShowFilters(true)}
        >
          Filtros
        </Button>
      )}
    </>
  )
}
