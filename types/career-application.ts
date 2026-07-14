import { CareerApplicationStatus } from "@prisma/client"

export interface CareerApplictionDTO {
  id: string
  jobId: string
  name: string
  email: string
  phone: string | null
  portfolioUrl: string | null
  message: string | null
  resumeFileName: string
  consentAt: string
  ipAddress: string
  status: CareerApplicationStatus
  createdAt: string
}
