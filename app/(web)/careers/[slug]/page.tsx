import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/json-ld'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { CAREER_EMPLOYMENT_TYPE_LABELS } from '@/src/lib/career-labels'
import { CareerJobService } from '@/src/services/career-job.service'
import type { CareerJobDTO } from '@/types/career-job'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { CareerApplicationForm } from './career-application-form'

// Mapeia pro enum schema.org/employmentType — nomes diferentes do enum do
// Prisma (INTERNSHIP -> INTERN, CONTRACT -> CONTRACTOR).
const JOB_POSTING_EMPLOYMENT_TYPE: Record<
  CareerJobDTO['employmentType'],
  string
> = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  INTERNSHIP: 'INTERN',
  CONTRACT: 'CONTRACTOR',
  TEMPORARY: 'TEMPORARY',
}

function buildJobPostingDescription(job: CareerJobDTO): string {
  const responsibilities = job.content.responsibilities
    .map((item) => `<li>${item}</li>`)
    .join('')
  const requirements = job.content.requirements
    .map((item) => `<li>${item}</li>`)
    .join('')

  return [
    `<p>${job.summary}</p>`,
    `<p>${job.content.about}</p>`,
    `<p>O que você vai fazer:</p><ul>${responsibilities}</ul>`,
    `<p>O que buscamos:</p><ul>${requirements}</ul>`,
  ].join('')
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const result = await CareerJobService.getBySlug(slug)
  if (!result.ok) return { title: 'Vaga não encontrada | Nexo' }

  const title = `${result.value.title} | Carreiras Nexo`
  const { summary } = result.value

  return {
    title,
    description: summary,
    alternates: { canonical: `/careers/${slug}` },
    openGraph: {
      type: 'website',
      url: `/careers/${slug}`,
      title,
      description: summary,
      images: ['/opengraph-image'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: summary,
      images: ['/twitter-image'],
    },
  }
}

export default async function CareerJobPage({ params }: Props) {
  const { slug } = await params
  const result = await CareerJobService.getBySlug(slug)
  if (!result.ok) notFound()

  const job = result.value
  const jobUrl = `${NEXT_PUBLIC_URL}/careers/${job.slug}`

  const jobPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: buildJobPostingDescription(job),
    datePosted: job.createdAt,
    ...(job.status === 'CLOSED' && { validThrough: job.updatedAt }),
    employmentType: JOB_POSTING_EMPLOYMENT_TYPE[job.employmentType],
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Nexo',
      sameAs: NEXT_PUBLIC_URL,
      logo: `${NEXT_PUBLIC_URL}/brand/logo.png`,
    },
    ...(job.locationType === 'REMOTE'
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: {
            '@type': 'Country',
            name: 'Brazil',
          },
        }
      : {
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: job.location ?? undefined,
              addressCountry: 'BR',
            },
          },
        }),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: NEXT_PUBLIC_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Carreiras',
        item: `${NEXT_PUBLIC_URL}/careers`,
      },
      { '@type': 'ListItem', position: 3, name: job.title, item: jobUrl },
    ],
  }

  return (
    <main className='w-full py-12 md:py-16'>
      <JsonLd data={jobPostingSchema} />
      <JsonLd data={breadcrumbSchema} />
      <div className='mx-auto w-full flex flex-col items-center justify-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10'>
        <div className='flex flex-col gap-6 items-center'>
          <Link
            href='/careers'
            className='text-cyan-500 text-sm md:whitespace-pre-line mb-4'
          >
            Carreiras Nexo
          </Link>
          <Title>{job.title}</Title>
          <div className='flex flex-col gap-4 items-center'>
            <Muted>
              {job.location} ·{' '}
              {CAREER_EMPLOYMENT_TYPE_LABELS[job.employmentType]}
            </Muted>
            <Dialog>
              <DialogTrigger render={<Button>Candidatar-se</Button>} />
              <DialogContent
                className='sm:max-w-lg max-h-[85vh] overflow-y-auto'
                showCloseButton={false}
              >
                <DialogHeader>
                  <DialogTitle className='text-xl'>
                    Candidatar-se pra {job.title}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha seus dados e a gente entra em contato pelo e-mail
                    informado.
                  </DialogDescription>
                </DialogHeader>
                <CareerApplicationForm slug={job.slug} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className='max-w-3xl flex flex-col gap-8'>
          <div>
            <h2 className='text-4xl font-medium'>Sobre o Nexo</h2>
            <p className='py-2 text-base leading-[1.7]'>
              A missão do Nexo é ajudar equipes modernas a fazer seu trabalho no
              menor tempo possível. Todo time roda em cima de três coisas: os
              projetos que conduz, o conhecimento que registra, e o contexto que
              a IA precisa pra ajudar de verdade. O Nexo junta essas três numa
              assinatura só — simples o bastante pra qualquer time adotar,
              sólida o bastante pra crescer junto com ele. E estamos construindo
              isso pra um futuro onde humanos e agentes de IA fazem esse
              trabalho lado a lado.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              O Nexo nasceu de uma dor concreta: numa empresa anterior, era
              ClickUp pra tarefa, Notion pra documentação, Trello em alguns
              projetos — e nada conversava com nada. Pra pedir ajuda de IA num
              problema, era preciso juntar manualmente o código, a issue e a doc
              antes de sequer começar. Hoje o Nexo roda como serviço na nuvem ou
              na infraestrutura do próprio cliente, incluindo ambientes
              totalmente isolados. Construir resolvendo a própria dor primeiro é
              o que nos mantém perto de quem usa.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              Nossa visão é virar a alternativa número 1 às ferramentas de
              gestão de projeto existentes, e o lugar onde meio milhão de
              pessoas fazem seu trabalho todos os dias. Não chegamos lá ainda —
              hoje é o começo — mas cada decisão de produto é medida pelo tanto
              de tempo que devolve pro time que usa.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              O Nexo é bootstrapped, sem investimento externo — hoje somos duas
              pessoas construindo a fundação inteira. Trabalhamos em times
              pequenos, perto de quem usa, e nos importamos tanto com o que
              aparece quanto com o detalhe que ninguém vê mas que faz o software
              ser confiável. Cada pessoa é dona do problema do início ao fim, e
              só adicionamos processo quando ele realmente ajuda o trabalho.
            </p>
          </div>
          <div>
            <h2 className='text-4xl font-medium'>Humanos e agentes</h2>
            <p className='py-2 text-base leading-[1.7]'>
              Acreditamos que a próxima década de trabalho vai ser feita por
              humanos e agentes de IA juntos. Não é agente substituindo pessoa,
              nem uma janela de chat colada num software feito pra clique humano
              — é os dois atuando no mesmo sistema, onde o trabalho de um agente
              é tão visível e responsável quanto o de uma pessoa.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              A maioria dos softwares trata IA como um recurso a mais. A gente
              trata agentes como um tipo de trabalhador, e isso muda o que o
              sistema por baixo precisa ser. Um agente só é tão bom quanto o
              contexto que ele enxerga e o estado que ele pode mudar — então
              contexto compartilhado, estado explícito, histórico durável e ação
              responsável não são itens do roadmap. São o produto. O Nexo é
              construído pra que, quando um agente age, a pessoa responsável
              consiga ver o que aconteceu, por quê, e sob autoridade de quem — e
              esse registro sobrevive.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              É pra isso que a infraestrutura existe: tornar o futuro onde
              humanos e agentes trabalham juntos útil, legível e totalmente sob
              controle da organização. Todo cargo no Nexo é uma parte de
              construir isso.
            </p>
          </div>
          <div>
            <h2 className='text-4xl font-medium'>Sobre a vaga</h2>
            <p className='py-2 text-base leading-[1.7]'>{job.content.about}</p>
          </div>
          <div>
            <h2 className='text-4xl font-medium'>O que você vai fazer</h2>
            <ul className='py-2 text-base leading-[1.7] list-disc pl-5 space-y-1'>
              {job.content.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className='text-4xl font-medium'>O que você vai trazer</h2>
            <ul className='py-2 text-base leading-[1.7] list-disc pl-5 space-y-1'>
              {job.content.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          {job.content.niceToHave && job.content.niceToHave.length > 0 && (
            <div>
              <h2 className='text-4xl font-medium'>Diferenciais</h2>
              <ul className='py-2 text-base leading-[1.7] list-disc pl-5 space-y-1'>
                {job.content.niceToHave.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className='text-4xl font-medium'>Stack</h2>
            <ul className='py-2 text-base leading-[1.7] list-disc pl-5 space-y-1'>
              {job.content.stack.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className='pb-16'>
            <h2 className='text-4xl font-medium'>Por que o Nexo?</h2>
            <p className='py-2 text-base leading-[1.7]'>
              Toda empresa diz que é diferente. A gente prefere mostrar
              evidência.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              <strong>O problema é real.</strong> O time é pequeno, mas o que
              resolvemos não é brincadeira de startup: algo que você constrói
              esse mês pode rodar no time de 10 pessoas que cresceu rápido
              demais pra caber numa conversa de corredor — e você vai ouvir isso
              direto de quem usa, não de um relatório.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              <strong>As restrições te fazem melhor.</strong> O Nexo roda na
              nossa nuvem, na nuvem do cliente, e em máquinas que nunca tocam a
              internet. Construir software que aguenta isso tudo é mais difícil
              que construir um SaaS comum — e é um aprendizado que pouca empresa
              consegue oferecer.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              <strong>
                O futuro de humanos e agentes está sendo construído aqui, em
                produção.
              </strong>{' '}
              Achamos que humanos e agentes de IA vão dividir um sistema só pra
              fazer o trabalho. Estamos construindo esse sistema agora, pensando
              nos times que vão depender dele — e você vai trabalhar nesse
              problema direto, seja qual for o seu cargo.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              <strong>Seu nome está no trabalho.</strong> O time é pequeno o
              bastante pra que crédito e responsabilidade cheguem rápido até
              você. Isso é uma pressão, sim. Na maior parte do tempo, é a parte
              divertida.
            </p>
            <p className='py-2 text-base leading-[1.7]'>
              Se isso soa como o seu tipo de lugar, a gente quer te conhecer.
            </p>
            <p className='py-2 text-sm text-muted-foreground leading-[1.7]'>
              O Nexo é um empregador que oferece oportunidades iguais pra todos.
              Não discriminamos por raça, cor, religião, identidade ou expressão
              de gênero, orientação sexual, origem, idade, deficiência ou
              qualquer outra característica protegida por lei.
            </p>
          </div>
        </div>
      </div>
      <WebFooter />
    </main>
  )
}
