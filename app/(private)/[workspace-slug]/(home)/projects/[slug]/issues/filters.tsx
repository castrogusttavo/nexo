'use client'

import { IssueFilterDropdown } from '@/app/_components/issue/filter/issue-filter'
import { IssueShowPropertiesDropdown } from '@/app/_components/issue/filter/issue-show-properties'
import { IssuesAnalyticsPanel } from '@/app/_components/issue/panel/issues-analytics-panel'

export function IssuesFilters() {
  return (
    <>
      <IssueFilterDropdown />
      <IssueShowPropertiesDropdown />
      <IssuesAnalyticsPanel />
    </>
  )
}
