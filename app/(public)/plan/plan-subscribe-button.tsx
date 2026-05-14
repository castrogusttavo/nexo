'use client'

import { useState } from 'react'
import { useLogger } from '@/lib/axiom/client'

export function PlanSubscribeButton({
  workspaceId,
}: {
  workspaceId: string | null
}) {
  const log = useLogger()
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    if (!workspaceId) return
    setLoading(true)

    try {
      const response = await fetch('/api/payment/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'PRO',
          workspaceId,
        }),
      })

      const result = await response.json()

      if (result.success && result.data?.paymentUrl) {
        window.location.href = result.data.paymentUrl
      }
    } catch (error) {
      log.error('plan.subscribe_failed', {
        component: 'PlanSubscribeButton',
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button disabled={loading || !workspaceId} onClick={handleSubscribe}>
      {loading ? 'Processando...' : 'Assinar PRO'}
    </button>
  )
}
