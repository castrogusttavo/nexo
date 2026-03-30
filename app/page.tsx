'use client'

import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { useCacheUser } from '@/src/hooks/cache/use-user'
import { useCollaborativeText } from '@/src/hooks/use-collaborative-text'
import { useUser } from '@/src/hooks/use-user'

export default function Page() {
  const { status, data } = useUser()
  const { data: session } = useCacheUser()
  const { text, handleChange, users, connected } = useCollaborativeText({
    docName: 'test-doc',
    userName: session?.user?.name ?? undefined,
  })

  if (status === 'pending') return <div>Carregando...</div>
  if (status === 'error') return <div>Erro ao carregar usuário</div>

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
        <div className='flex items-center justify-between'>
          <h2 className='text-xl font-semibold'>Editor Colaborativo</h2>
          <div className='flex items-center gap-3'>
            <div className='flex -space-x-1.5'>
              {users.map((u) => (
                <div
                  key={u.id}
                  className='size-6 rounded-full border-2 border-background text-[10px] font-medium flex items-center justify-center text-white'
                  style={{ backgroundColor: u.color }}
                  title={u.name}
                >
                  {u.name[0]?.toUpperCase()}
                </div>
              ))}
            </div>
            <div className='flex items-center gap-1.5'>
              <span
                className={`size-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
              />
              <span className='text-xs text-muted-foreground'>
                {connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>

        <textarea
          className='w-full h-48 p-3 border rounded-md font-mono text-sm resize-none'
          placeholder='Digite seu markdown aqui...'
          value={text}
          onChange={handleChange}
        />

        {text.trim() && (
          <div className='border rounded-md p-4 prose prose-sm max-w-none'>
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
