import type { NextRequest } from 'next/server'
import { STATUS_COLLECTOR_SECRET } from '@/lib/env/server'
import type { ComponentTier } from '@/src/services/status/components'
import { StatusService } from '@/src/services/status/status.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function checkSecret(request: NextRequest): boolean {
  const provided = request.headers.get('x-status-secret')
  if (!provided) return false
  return constantTimeEqual(provided, STATUS_COLLECTOR_SECRET)
}

export async function handleCollect(request: NextRequest, tier: ComponentTier) {
  if (!checkSecret(request)) {
    return standardError('UNAUTHORIZED', 'Invalid collector secret')
  }

  const result = await StatusService.collect(tier)
  if (!result.ok) return handleError(result.error)

  return successResponse({ tier, collectedAt: new Date().toISOString() })
}
