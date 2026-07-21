export type LabelColorDTO =
  | 'RED'
  | 'YELLOW'
  | 'BLUE'
  | 'GREEN'
  | 'PURPLE'
  | 'ZINC'

export interface LabelDTO {
  id: string
  name: string
  description: string | null
  color: LabelColorDTO
  projectId: string
  createdAt: string
  updatedAt: string
}
