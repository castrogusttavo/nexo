'use client'

import { FilterMailIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { activeIssueFilterCount } from '@/app/_components/workspace/project/issue/filter/apply-issue-filters'
import { IssueFilterContainer } from '@/app/_components/workspace/project/issue/filter/issue-filter-container'
import { IssueShowPropertiesDropdown } from '@/app/_components/workspace/project/issue/filter/issue-show-properties-dropdown'
import { useIssueFilters } from '@/app/_components/workspace/project/issue/filter/use-issue-filters'
import { IssueAnalyticsPanel } from '@/app/_components/workspace/project/issue/issue-analytics-panel'
import { NexoIcon } from '@/components/icon/icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface IssueFiltersProps {
  workspaceId: string
  projectSlug: string
}

export function IssueFilters({ workspaceId, projectSlug }: IssueFiltersProps) {
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
          <IssueFilterContainer
            workspaceId={workspaceId}
            projectSlug={projectSlug}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <IssueShowPropertiesDropdown />
      <IssueAnalyticsPanel />
    </>
  )
}
