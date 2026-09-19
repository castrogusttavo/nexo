'use client'

import { FilterMailIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { IssueShowPropertiesDropdown } from '@/app/_components/issue/filter/issue-show-properties'
import { IssuesAnalyticsPanel } from '@/app/_components/issue/panel/issues-analytics-panel'
import { activeIssueFilterCount } from '@/components/filters/apply-issue-filters'
import { FilterContainer } from '@/components/filters/filter-container'
import { useIssueFilters } from '@/components/filters/use-issue-filters'
import { NexoIcon } from '@/components/icon/icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface IssuesFiltersProps {
  workspaceId: string
  projectSlug: string
}

export function IssuesFilters({
  workspaceId,
  projectSlug,
}: IssuesFiltersProps) {
  const [open, setOpen] = useState(false)
  const [filterState] = useIssueFilters()
  const activeCount = activeIssueFilterCount(filterState)

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant={activeCount > 0 ? 'secondary' : 'outline'}
              size={activeCount > 0 ? 'sm' : 'icon-sm'}
              className='h-8'
              aria-label='Filtrar'
            >
              <NexoIcon icon={FilterMailIcon} strokeWidth={2} />
              {activeCount > 0 && <Badge variant='info'>{activeCount}</Badge>}
            </Button>
          }
        />
        <PopoverContent
          align='end'
          className='w-auto max-w-[calc(100vw-2rem)] p-0'
        >
          <FilterContainer
            workspaceId={workspaceId}
            projectSlug={projectSlug}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <IssueShowPropertiesDropdown />
      <IssuesAnalyticsPanel />
    </>
  )
}
