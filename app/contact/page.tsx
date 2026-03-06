'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/src/hooks/use-user'

export default function ContactPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const { status, data, error } = useUser()

  if (status === 'pending') return <div>Carregando...</div>

  if (status === 'error') return <div>Erro: {error.message}</div>

  async function handleSubmit(e: React.ChangeEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/send/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username: data.name }),
      })

      if (!res.ok) {
        toast.error('Erro ao enviar e-mail')
        return
      }

      toast.success('E-mail enviado com sucesso!')
      setEmail('')
    } catch {
      toast.error('Erro ao enviar e-mail')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <form
        onSubmit={handleSubmit}
        className='flex flex-col gap-4 w-full max-w-sm'
      >
        <Input
          type='email'
          placeholder='Digite seu e-mail'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className='border rounded-md px-4 py-2'
        />
        <Button
          type='submit'
          disabled={loading}
          className='bg-black text-white rounded-md px-4 py-2 disabled:opacity-50'
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </Button>
      </form>
    </div>
  )
}
