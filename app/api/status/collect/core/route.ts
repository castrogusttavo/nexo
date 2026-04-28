import type { NextRequest } from 'next/server'
import { handleCollect } from '../_handler'

export async function POST(request: NextRequest) {
  return handleCollect(request, 'core')
}
