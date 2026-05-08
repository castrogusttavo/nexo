import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { handleCollect } from '../_handler'

export const POST = withAxiom(async (request: NextRequest) => {
  return handleCollect(request, 'core')
})
