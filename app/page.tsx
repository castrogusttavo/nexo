'use client'

import Image from 'next/image'
import { useCacheUser } from '@/src/hooks/cache/use-user'
import { useUser } from '@/src/hooks/use-user'

export default function Page() {
  const { status, data } = useUser()
  const { data: session } = useCacheUser()

  if (status === 'pending') return <div>Carregando...</div>
  if (status === 'error') return <div>Erro ao carregar usuário</div>

  return (
    <div>
      <h1>Olá, {session?.user?.name}</h1>
      <p>Nome: {data.name}</p>
      <p>Email: {data.email}</p>
      {data.image && (
        <Image
          className='rounded-full'
          width={32}
          height={32}
          src={data.image}
          alt={data.name}
        />
      )}
    </div>
  )
}
