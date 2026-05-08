'use client'

import { useEffect, useState } from 'react'
import { useLogger } from '@/lib/axiom/client'

export default function PlanPage() {
  const log = useLogger()
  const [loading, setLoading] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          const memberships = result.data.memberships ?? []
          if (memberships.length > 0) {
            setWorkspaceId(memberships[0].workspaceId)
          }
        }
      })
  }, [])

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
        component: 'PlanPage',
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button disabled={loading || !workspaceId} onClick={handleSubscribe}>
        {loading ? 'Processando...' : 'Assinar PRO'}
      </button>
    </div>
  )
}
