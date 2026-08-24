import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503 })
  }
}
