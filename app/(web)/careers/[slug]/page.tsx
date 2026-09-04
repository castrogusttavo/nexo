import { ArrowLeft02Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CAREER_EMPLOYMENT_TYPE_LABELS,
  CAREER_LOCATION_TYPE_LABELS,
} from '@/src/lib/career-labels'
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
    alternates: { canonical: `/careers/${slug}` },
  }
}

export default async function CareerJobPage({ params }: Props) {
  const { slug } = await params
  const result = await CareerJobService.getBySlug(slug)
  if (!result.ok) notFound()

  const job = result.value

  return (
    <main className='mx-auto max-w-3xl px-6 py-20 space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1.5'>
          <Link href='/careers'>
            <NexoIcon icon={ArrowLeft02Icon} strokeWidth={2} size={20} />
          </Link>
          <h1 className='text-2xl font-semibold'>{job.title}</h1>
        </div>
        {job.status === 'CLOSED' && (
          <span className='text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground'>
            Encerrada
          </span>
        )}
      </div>
      <div className='flex gap-8'>
        <div className='w-75 space-y-4'>
          <div className='space-y-2 pb-4 border-b border-border'>
            <Muted className='text-xs'>Localização</Muted>
            <p className='text-sm text-muted-foreground font-light'>
              {job.location}
            </p>
          </div>
          <div className='space-y-2 pb-4 border-b border-border'>
            <Muted className='text-xs'>Tipo de emprego</Muted>
            <p className='text-sm text-muted-foreground font-light'>
              {CAREER_EMPLOYMENT_TYPE_LABELS[job.employmentType]}
            </p>
          </div>
          <div className='space-y-2 pb-4 border-b border-border'>
            <Muted className='text-xs'>Tipo de localização</Muted>
            <p className='text-sm text-muted-foreground font-light'>
              {CAREER_LOCATION_TYPE_LABELS[job.locationType]}
            </p>
          </div>
          <div className='space-y-2 pb-4'>
            <Muted className='text-xs'>Departamento</Muted>
            <p className='text-sm text-muted-foreground font-light'>
              {job.department}
            </p>
          </div>
        </div>
        <Tabs className='w-full'>
          <TabsList variant='line'>
            <TabsTrigger value='overview' className='text-start justify-start'>
              Visão geral
            </TabsTrigger>
            <TabsTrigger value='application'>Aplicar</TabsTrigger>
          </TabsList>
          <TabsContent value='overview'>
            <section className='mt-8 flex flex-col gap-6'>
              <div>
                <h2 className='text-lg font-medium'>Sobre o Nexo</h2>
                <p className='mt-2 text-sm text-muted-foreground'>
                  A missão do Nexo é ajudar equipes modernas a fazer seu
                  trabalho no menor tempo possível. Queremos que times avancem
                  sem perder contexto entre ferramentas - centralizando
                  projetos, wiki e IA numa assinatura só, num lugar que fala a
                  mesma língua do início ao fim do trabalho. É a infraestrutura
                  de trabalho que a gente gostaria de ter tido antes.
                </p>
                <p className='mt-2 text-sm text-muted-foreground'>
                  O Nexo nasceu de uma dor concreta: numa empresa anterior, era
                  ClickUp pra tarefa, Notion para documentação e Trello em
                  alguns projetos - e nada conversava com nada. Pra pedir ajuda
                  para IA num problema, era preciso juntar manualmente o código,
                  a issue e a doc. Desde o primeiro commit, em janeiro de 2026,
                  construímos o Nexo pra que isso nunca mais precise acontecer -
                  um commit de cada vez, direto na main, com o mesmo rigor de CI
                  que esperamos de qualquer time que confia o próprio trabalho a
                  uma plataforma.
                </p>
                <p className='mt-2 text-sm text-muted-foreground'>
                  Acreditamos que IA só ajuda de verdade quando compartilha o
                  mesmo contexto do trabalho, não quando é mais uma aba pra
                  alimentar manualmente. Por isso a IA no Nexo é embarcada - não
                  é integração de terceiro - e vive no mesmo lugar que os
                  projetos e a wiki.
                </p>
                <p className='mt-2 text-sm text-muted-foreground'>
                  Hoje o Nexo é um time pequeno: um engenheiro fundador cuidando
                  de produto, arquitetura e infraestrutura, e uma pessoa de
                  marketing - sem investimento externo. Cada pessoa é dona dos
                  problemas de ponta a ponta, e processo só entra quando
                  realmente destrava trabalho.
                </p>
                <p className='mt-2 text-sm text-muted-foreground'>
                  Ainda estamos no começo. Se você quer ajudar a definir o que
                  essa infraestrutura de trabalho pode ser - sem herdar padrão
                  de ninguém, porque ainda estamos criando os padrões - queremos
                  te conhecer.
                </p>
              </div>

              <div>
                <h2 className='text-lg font-medium'>Sobre a vaga</h2>
                <p className='mt-2 text-sm text-muted-foreground'>
                  {job.content.about}
                </p>
              </div>

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
          </TabsContent>
          <TabsContent value='application'>
            {job.status === 'OPEN' ? (
              <CareerApplicationForm slug={job.slug} />
            ) : (
              <Muted className='text-xs'>
                Esta vaga não está mais recebendo candidaturas.
              </Muted>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
