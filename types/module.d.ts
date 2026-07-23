export type ModuleStatusDTO =
  | 'BACKLOG'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface ModuleDTO {
  id: string
  name: string
  progress: number
  status: ModuleStatusDTO
  startDate: string | null
  endDate: string | null
  isFavorited: boolean
  leadId: string
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface ModuleMemberDTO {
  userId: string
  name: string
  username: string
  image: string | null
  isLead: boolean
  createdAt: string
}
