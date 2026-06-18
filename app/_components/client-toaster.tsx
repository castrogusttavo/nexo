'use client'

import dynamic from 'next/dynamic'

export const ClientToaster = dynamic(
  () => import('@/components/ui/sonner').then((m) => ({ default: m.Toaster })),
  { ssr: false },
)
