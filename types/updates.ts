export type UpdateStatusDTO = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK'

export interface UpdateAuthorDTO {
	id: string
	name: string
	username: string
	image: string | null
}

export interface UpdateReactionSummaryDTO {
	emoji: string
	count: number
	// The viewer already with this emoji.
	reactedByMe: boolean
}

export interface UpdateReplyDTO {
	id: string
	updateId: string
	content: string
	author: UpdateAuthorDTO | null // null: the author was removed
	editedAt: string | null
	createdAt: string
}

export interface UpdateDTO {
	id: string
	projectId: string | null
	issueId: string | null
	status: UpdateStatusDTO
	content: string | null
	author: UpdateAuthorDTO | null
	editedAt: string | null
	createdAt: string
	replyCount: number
	reactions: UpdateReactionSummaryDTO[]
}

export interface UpdatesPageDTO {
	updates: UpdateDTO[]
	nextCursor: string | null
}