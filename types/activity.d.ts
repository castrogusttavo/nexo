export type ActivityEntityTypeDTO = 'ISSUE' | 'CYCLE' | 'MODULE'

export interface ActivityActorDTO {
  id: string
  name: string
  username: string
  image: string | null
}

export interface ActivityDTO {
  id: string
  entityType: ActivityEntityTypeDTO
  entityId: string
  field: string
  oldValue: unknown
  newValue: unknown
  actor: ActivityActorDTO
  createdAt: string
}
