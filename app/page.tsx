'use client'

import { useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { useCacheUser } from '@/src/hooks/cache/use-user'
import { useUser } from '@/src/hooks/use-user'

export default function Page() {
  const { status, data } = useUser()
  const { data: session } = useCacheUser()
  const [markdown, setMarkdown] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  if (status === 'pending') return <div>Carregando...</div>
  if (status === 'error') return <div>Erro ao carregar usuário</div>

  async function handleUpload() {
    setUploading(true)
    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdown, filename: 'test.md' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      setPreview(json.data.content)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className='flex flex-col gap-6 p-8 max-w-3xl mx-auto'>
      <div>
        <h1 className='text-2xl font-bold'>Olá, {session?.user?.name}</h1>
        <p className='text-muted-foreground'>
          {data.name} &middot; {data.email}
        </p>
        {data.image && (
          <Image
            className='rounded-full mt-2'
            width={32}
            height={32}
            src={data.image}
            alt={data.name}
          />
        )}
      </div>

      <hr />

      <div className='flex flex-col gap-4'>
        <h2 className='text-xl font-semibold'>Teste MinIO — Markdown</h2>

        <textarea
          className='w-full h-48 p-3 border rounded-md font-mono text-sm resize-none'
          placeholder='Digite seu markdown aqui...'
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
        />

        <button
          type='button'
          className='self-start px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50'
          onClick={handleUpload}
          disabled={uploading || !markdown.trim()}
        >
          {uploading ? 'Enviando...' : 'Upload & Preview'}
        </button>

        {preview && (
          <div className='border rounded-md p-4 prose prose-sm max-w-none'>
            <ReactMarkdown>{preview}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
