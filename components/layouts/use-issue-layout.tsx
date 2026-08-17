'use client'

import { parseAsStringEnum, useQueryState } from "nuqs"

export type IssueLayout = 'list' | 'kanban' | 'calendar' | 'table' | 'timeline'

const ISSUE_LAYOUTS: IssueLayout[] = ['list', 'kanban', 'calendar', 'table', 'timeline']

export function useIssueLayout() {
  return useQueryState('layout', parseAsStringEnum(ISSUE_LAYOUTS).withDefault('list').withOptions({ shallow: false }))
}
