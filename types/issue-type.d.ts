export interface IssueTypeDTO {
  id: string
  name: string
  description: string | null
  color: 'RED' | 'YELLOW' | 'BLUE' | 'GREEN' | 'PURPLE' | 'ZINC'
  icon: string
  isSystem: boolean
  order: number
  projectId: string
  createdAt: string
  updatedAt: string
}
