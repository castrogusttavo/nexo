import { CareerJobContentDTO } from "@/src/schemas/career-job.schema"
import { CareerEmploymentType, CareerJobStatus, CareerLocationType } from "@prisma/client"

export interface CareerJobDTO {
  id: string
  slug: string
  title: string
  department: string | null
  summary: string
  content: CareerJobContentDTO
  location: string | null
  locationType: CareerLocationType
  employmentType: CareerEmploymentType
  status: CareerJobStatus
  createdAt: string
  updatedAt: string
}
