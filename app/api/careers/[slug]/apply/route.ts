import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { apiLimiter } from '@/src/lib/rate-limit'
import { getClientIp, withRateLimit } from '@/src/lib/rate-limit-helpers'
import { CreateCareerApplicationSchema } from '@/src/schemas/career-application.schema'
import { CareerApplicationService } from '@/src/services/career-application.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const POST = withAxiom(
  withRateLimit(
    (request) => ({ limiter: apiLimiter, key: `ip:${getClientIp(request)}` }),
    async (
      request: NextRequest,
      { params }: { params: Promise<{ slug: string }> },
    ) => {
      const { slug } = await params
      const formData = await request.formData().catch(() => null)
      if (!formData) {
        return standardError('VALIDATION_ERROR', 'Dados inválidos')
      }

      // Bots fill hidden fields humans never see. Return a fake success
      // instead of a validation error, so the trap stays invisible
      const honeypot = formData.get('honeypot')
      if (typeof honeypot === 'string' && honeypot.length > 0) {
        return successResponse({ received: true }, 201)
      }

      const resume = formData.get('resume')
      if (!(resume instanceof File)) {
        return standardError('VALIDATION_ERROR', 'Envie o currículo em PDF')
      }

      const payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone') || undefined,
        portfolioUrl: formData.get('portfolioUrl') || undefined,
        message: formData.get('message') || undefined,
        consent: formData.get('consent') === 'true',
      }

      const parsed = CreateCareerApplicationSchema.safeParse(payload)
      if (!parsed.success) {
        return standardError(
          'VALIDATION_ERROR',
          'Dados inválidos',
          parsed.error.issues,
        )
      }

      const buffer = Buffer.from(await resume.arrayBuffer())

      const result = await CareerApplicationService.submit(parsed.data, {
        slug,
        ipAddress: getClientIp(request),
        resumeFile: {
          buffer,
          contentType: resume.type,
          fileName: resume.name,
        },
      })
      if (!result.ok) return handleError(result.error)

      return successResponse({ received: true }, 201)
    },
  ),
)
