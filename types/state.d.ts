export type StateGroupDTO =
  | 'BACKLOG'
  | 'UNSTARTED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED'

export type StateColorDTO =
  | 'RED'
  | 'YELLOW'
  | 'BLUE'
  | 'GREEN'
  | 'PURPLE'
  | 'ZINC'

export interface StateDTO {
  id: string
  name: string
  description: string | null
  group: StateGroupDTO
  color: StateColorDTO
  order: number
  isDefault: boolean
  projectId: string
  createdAt: string
  updatedAt: string
}
