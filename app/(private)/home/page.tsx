'use client'

import { useState } from 'react'

export default function HomePage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.message ?? 'Erro ao criar workspace')
        return
      }

      setSuccess(true)
    } catch {
      setError('Erro ao criar workspace')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div>
        <p>Workspace criado com sucesso!</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Criar Workspace</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor='name'>Nome</label>
          <input
            id='name'
            type='text'
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
        </div>
        <div>
          <label htmlFor='slug'>Slug</label>
          <input
            id='slug'
            type='text'
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            minLength={2}
            maxLength={50}
            pattern='^[a-z0-9-]+$'
            required
          />
        </div>
        {error && <p>{error}</p>}
        <button type='submit' disabled={loading}>
          {loading ? 'Criando...' : 'Criar Workspace'}
        </button>
      </form>
    </div>
  )
}
