export type StateGroupKey =
  | 'BACKLOG'
  | 'UNSTARTED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface ProjectProgressGroupDTO {
  group: StateGroupKey
  count: number
  /** count / total, 0-100, rounded. */
  percentage: number
}

export interface ProjectProgressDTO {
  total: number
  /** COMPLETED / (total - CANCELLED), 0-100, rounded. */
  completionPercentage: number
  groups: ProjectProgressGroupDTO[]
}