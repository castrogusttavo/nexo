import { StateColorDTO } from "./state"

export type ProjectStateGroupDTO =
  | 'DRAFT'
  | 'PLANNING'
  | 'EXECUTION'
  | 'MONITORING'
  | 'COMPLETED'
  | 'CANCELLED'

export interface ProjectStateDTO {
  id: string
  name: string
  description: string | null
  group: ProjectStateGroupDTO
  color: StateColorDTO,
  order: number
  isDefault: boolean
  workspaceId: string
  createdAt: string
  updatedAt: string
}
