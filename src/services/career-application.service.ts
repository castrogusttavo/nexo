import { createId } from '@paralleldrive/cuid2'
import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { careerJobClosed } from '../errors'
import { sendCareerApplicationEmail } from '../lib/mail/careers/send-career-application'
import { err, ok, type Result } from '../lib/result'
import { getPresignedDownloadUrl } from '../lib/storage/s3'
import { CareerApplicationRepository } from '../repositories/career-application.repository'
import { CareerJobRepository } from '../repositories/career-job.repository'
import type { CreateCareerApplicationDTO } from '../schemas/career-application.schema'
import {
  CAREER_APPLICATIONS_BUCKET,
  persistResume,
  validateResume,
} from './career/_resume'

const RESUME_LINK_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days, matches data-export precedent

interface ResumeFile {
  buffer: Buffer
  contentType: string
  fileName: string
}

interface SubmitContext {
  slug: string
  ipAddress: string
  resumeFile: ResumeFile
}

export const CareerApplicationService = {
  async submit(
    dto: CreateCareerApplicationDTO,
    context: SubmitContext,
  ): Promise<Result<void>> {
    const jobResult = await CareerJobRepository.findBySlug(context.slug)
    if (!jobResult.ok) return jobResult

    const job = jobResult.value
    if (job.status !== 'OPEN') return err(careerJobClosed())

    const resumeValidation = validateResume(
      context.resumeFile.contentType,
      context.resumeFile.buffer,
    )
    if (!resumeValidation.ok) return resumeValidation

    const resumeKey = `${job.id}/${createId()}.pdf`
    const persisted = await persistResume({
      key: resumeKey,
      body: context.resumeFile.buffer,
    })
    if (!persisted.ok) return persisted

    const created = await CareerApplicationRepository.create({
      jobId: job.id,
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      linkedinUrl: dto.linkedinUrl ?? null,
      portfolioUrl: dto.portfolioUrl ?? null,
      lastJobTitle: dto.lastJobTitle ?? null,
      experienceYears: dto.experienceYears ?? null,
      message: dto.message ?? null,
      resumeBucket: CAREER_APPLICATIONS_BUCKET,
      resumeKey,
      resumeFileName: context.resumeFile.fileName,
      consentAt: new Date(),
      ipAddress: context.ipAddress,
    })
    if (!created.ok) return created

    auditMutation({
      entity: 'career_application',
      action: 'create',
      actorId: null,
      targetId: created.value.id,
      meta: { jobId: job.id },
    })

    try {
      const resumeUrl = await getPresignedDownloadUrl({
        bucket: CAREER_APPLICATIONS_BUCKET,
        key: resumeKey,
        expiresInSeconds: RESUME_LINK_TTL_SECONDS,
      })
      await sendCareerApplicationEmail({
        jobTitle: job.title,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        linkedinUrl: dto.linkedinUrl,
        portfolioUrl: dto.portfolioUrl,
        lastJobTitle: dto.lastJobTitle,
        experienceYears: dto.experienceYears,
        message: dto.message,
        resumeUrl,
      })
    } catch (error) {
      // The application is already persisted = a mail hiccup should not
      // fail the candidate's submission, just get logged for follow-up
      logger.error('career_application.notification_failed', {
        component: 'CareerApplicationService',
        applicationId: created.value.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }

    return ok(undefined)
  },
}
