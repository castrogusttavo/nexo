export interface ProjectAttachmentDTO {
  id: string
  projectId: string
  fileName: string
  contentType: string
  size: number
  url: string
  uploadedById: string | null
  createdAt: string
}