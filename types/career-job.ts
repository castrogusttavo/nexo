import { CareerJobContentDTO } from "@/src/schemas/career-job.schema"
import { CareerJobStatus } from "@prisma/client"

export interface CareerJobDTO {
  id: string
  slug: string
  title: string
  department: string | null
  summary: string
  content: CareerJobContentDTO
  status: CareerJobStatus
  createdAt: string
  updatedAt: string
}
