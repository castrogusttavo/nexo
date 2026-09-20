export interface AttachmentDTO {
  id: string
  fileName: string
  contentType: string
  size: number
  url: string
  issueId: string
  uploadedById: string | null
  createdAt: string
}
