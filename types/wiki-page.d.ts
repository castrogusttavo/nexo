import { Value } from 'platejs'

export interface WikiPageDTO {
	id: string
	workspaceId: string
	parentId: string | null
	title: string
	icon: string | null
	coverImage: string | null
	content: Value
	position: number
	createdById: string
	updatedById: string | null
	archivedAt: string | null
	createdAt: string
	updatedAt: string 
}