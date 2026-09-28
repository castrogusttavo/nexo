import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Admin | Nexo' }

// The admin area had no index: /admin matched no page and answered with the
// 404 screen, even for an allowlisted admin with a second factor. Everything
// lived one level down, so the only way in was typing the full path.
const AREAS = [
  {
    href: '/admin/careers',
    title: 'Vagas',
    description: 'Criar, editar e publicar as vagas que aparecem em /careers.',
  },
  {
    href: '/admin/queues',
    title: 'Filas',
    description:
      'Painel das filas do BullMQ: jobs agendados, falhos e em execução. Pede a senha do workbench.',
  },
]

export default function AdminPage() {
  return (
    <main className='mx-auto max-w-4xl px-6 py-10'>
      <h1 className='text-2xl font-medium'>Administração</h1>

      <div className='mt-6 grid gap-3 sm:grid-cols-2'>
        {AREAS.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className='rounded-lg border border-border p-4 transition hover:border-primary'
          >
            <h2 className='font-medium'>{area.title}</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              {area.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
