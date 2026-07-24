export type CycleStatusDTO = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export interface CycleDTO {
  id: string
  name: string
  description: string | null
  status: CycleStatusDTO
  startDate: string | null
  endDate: string | null
  leadId: string
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface CycleMemberDTO {
  userId: string
  name: stirng
  username: string
  image: string | null
  isLead: boolean
  createdAt: string
}
