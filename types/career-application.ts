import { CareerApplicationStatus } from "@prisma/client"

export interface CareerApplictionDTO {
  id: string
  jobId: string
  name: string
  email: string
  phone: string | null
  linkedinUrl: string | null
  portfolioUrl: string | null
  lastJobTitle: string | null
  experienceYears: number | null
  message: string | null
  resumeFileName: string
  consentAt: string
  ipAddress: string
  status: CareerApplicationStatus
  createdAt: string
}
