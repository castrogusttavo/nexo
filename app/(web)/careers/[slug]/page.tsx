import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Muted } from '@/components/typography/text/muted'
import { CareerJobService } from '@/src/services/career-job.service'
import { CareerApplicationForm } from './career-application-form'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const result = await CareerJobService.getBySlug(slug)
  if (!result.ok) return { title: 'Vaga não encontrada | Nexo' }
  return {
    title: `${result.value.title} | Carreiras Nexo`,
    description: result.value.summary,
  }
}

export default async function CareerJobPage({ params }: Props) {
  const { slug } = await params
  const result = await CareerJobService.getBySlug(slug)
  if (!result.ok) notFound()

  const job = result.value

  return (
    <main className='mx-auto max-w-3xl px-6 py-20'>
      <div className='flex items-center justify-between'>
        <h1 className='text-4xl font-medium'>{job.title}</h1>
        {job.status === 'CLOSED' && (
          <span className='text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground'>
            Encerrada
          </span>
        )}
      </div>
      {job.department && <Muted className='mt-1'>{job.department}</Muted>}

      <section className='mt-8 flex flex-col gap-6'>
        <p>{job.content.about}</p>

        <div>
          <h2 className='text-lg font-medium'>O que você vai fazer</h2>
          <ul className='mt-2 list-disc pl-5 text-sm text-muted-foreground'>
            {job.content.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className='text-lg font-medium'>O que buscamos</h2>
          <ul className='mt-2 list-disc pl-5 text-sm text-muted-foreground'>
            {job.content.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {job.content.niceToHave && job.content.niceToHave.length > 0 && (
          <div>
            <h2 className='text-lg font-medium'>Diferenciais</h2>
            <ul className='mt-2 list-disc pl-5 text-sm text-muted-foreground'>
              {job.content.niceToHave.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className='text-lg font-medium'>Nossa stack</h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            {job.content.stack.join(' · ')}
          </p>
        </div>
      </section>

      <hr className='my-10 border-border' />

      {job.status === 'OPEN' ? (
        <CareerApplicationForm slug={job.slug} />
      ) : (
        <Muted>Esta vaga não está mais recebendo candidaturas.</Muted>
      )}
    </main>
  )
}
