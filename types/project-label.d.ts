import { StateColorDTO } from "./state";

export interface ProjectLabelDTO {
	id: string
	name: string
	description: string | null
	color: StateColorDTO
	workspaceId: string
	createdAt: string
	updatedAt: string
}
