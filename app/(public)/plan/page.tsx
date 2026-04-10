'use client'

import { useEffect, useState } from 'react'

export default function PlanPage() {
  const [loading, setLoading] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setWorkspaceId(result.data.workspaceId)
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
    } catch {
      console.error('Erro ao criar assinatura')
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
