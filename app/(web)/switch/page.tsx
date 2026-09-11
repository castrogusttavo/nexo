import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { WebFooter } from '../_components/footer'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'
import { SwitchCompareCarousel } from './switch-compare-carousel'
import { SwitchFaq } from './switch-faq'

const TITLE = 'Troque de ferramenta | Nexo'
const DESCRIPTION = 'Veja o que muda pro seu time ao trocar pro Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/switch' },
  openGraph: {
    type: 'website',
    url: '/switch',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/twitter-image'],
  },
}

export default function SwitchPage() {
  return (
    <>
      <main className='min-h-dvh w-full flex flex-col items-center flex-1 mx-auto'>
        <section className="flex flex-col items-center text-center mx-auto w-full bg-[url('/web/home/hero-bg.jpg')] bg-cover bg-center bg-no-repeat">
          <div className='xl:max-w-336 xl:px-11 2xl:max-w-384 flex flex-col items-start gap-6 py-16 text-left sm:py-20 md:items-center md:text-center lg:py-28'>
            <Title>Troque pro Nexo</Title>
            <SubTitle className='max-w-xl text-neutral-700'>
              Junte seu time e agentes de IA num só workspace. Mantenha
              projetos, docs e decisões conectados, e veja como migrar seu
              trabalho pro Nexo.
            </SubTitle>
            <div className='flex flex-wrap items-center justify-start gap-4 md:justify-center'>
              <Link href='/sign-up'>
                <Button size='lg'>Comece grátis</Button>
              </Link>
              <Link href='/talk-to-sales'>
                <Button size='lg' variant='secondary'>
                  Falar com vendas
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <section className='mx-auto w-full px-4 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 flex flex-col items-start gap-6 py-16 text-left sm:py-20 md:items-center md:text-center lg:py-28'>
          <div className='w-full text-start flex items-start justify-between'>
            <Title>
              Humanos e agentes, <br /> trabalhando juntos
            </Title>
            <div className='flex max-w-[52ch] flex-col gap-6 lg:pt-2'>
              <SubTitle>
                O Nexo é feito pra times planejarem e executarem trabalho ao
                lado de agentes. Seu time define prioridades e atribui tarefas.
                Agentes ajudam a rascunhar specs e atualizar itens de trabalho,
                enquanto seu time revisa os resultados.
              </SubTitle>
              <SubTitle>
                Projetos, docs e discussões continuam conectados, então humanos
                e agentes trabalham a partir do mesmo contexto.
              </SubTitle>
            </div>
          </div>
          <div className='w-full grid grid-cols-1 gap-y-10 lg:-mx-6 lg:grid-cols-3'>
            {[
              {
                title: 'Construído ao redor do seu time',
                description:
                  'O Nexo te dá estrutura com a liberdade de moldar como o trabalho acontece.',
                image: '/web/switch/built.jpg',
              },
              {
                title: 'Humanos lideram, agentes contribuem',
                description:
                  'Pessoas e agentes trabalham a partir do mesmo contexto. Seu time define prioridades e revisa os resultados.',
                image: '/web/switch/people.jpg',
              },
              {
                title: 'Seus dados, sempre com você',
                description:
                  'Exporte ou exclua seus dados quando quiser — sem ficar preso à nossa nuvem.',
                image: '/web/switch/run.jpg',
              },
            ].map((card) => (
              <div
                key={card.title}
                className='flex flex-col gap-6 lg:px-6 lg:pt-0 pt-8'
              >
                <Image
                  src={card.image}
                  alt=''
                  width={1024}
                  height={1024}
                  className='aspect-square w-full overflow-hidden rounded-lg'
                />
                <div className='text-start space-y-3'>
                  <h3 className='font-medium text-lg md:whitespace-pre-line'>
                    {card.title}
                  </h3>
                  <p className='text-base text-muted-foreground'>
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className='flex flex-col items-center text-center mx-auto w-full bg-surface-highlight'>
          <div className='w-full xl:max-w-336 xl:px-11 2xl:max-w-384 flex flex-col items-start gap-6 py-16 text-left sm:py-20 md:items-center md:text-center lg:py-28'>
            <div className='w-full text-start flex items-start justify-between'>
              <div className='space-y-4'>
                <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4 font-medium'>
                  apresentando o nexo
                </div>
                <Title>
                  Infraestrutura de trabalho <br /> pra humanos e agentes
                </Title>
              </div>
              <div className='flex max-w-[52ch] flex-col gap-6 lg:pt-2'>
                <SubTitle>
                  O Nexo reúne itens de trabalho, ciclos, páginas e entrada de
                  demandas num só workspace, 100% na nuvem.
                </SubTitle>
              </div>
            </div>
          </div>
        </section>
        <section className='w-full xl:max-w-336 xl:px-11 2xl:max-w-384 flex flex-col items-start gap-20 py-16 text-left sm:py-20 md:items-center md:text-center lg:py-28'>
          <div className='space-y-6'>
            <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4 font-medium'>
              por que trocar
            </div>
            <div className='space-y-4'>
              <Title>O que seu time ganha com o Nexo</Title>
              <SubTitle className='max-w-[68ch]'>
                Molde tudo isso pro jeito que seu time já trabalha.
              </SubTitle>
            </div>
          </div>
          <div className='w-full flex flex-col gap-16'>
            {[
              {
                title: 'Workflows que se encaixam no seu time',
                description:
                  'Configure estados, campos e aprovações no Nexo pro jeito que seu time trabalha. Automatize atualizações de rotina pra galera gastar menos tempo mantendo o board em dia.',
                alt: '',
                reverse: false,
              },
              {
                title: 'Traga agentes pro trabalho do dia a dia',
                description:
                  'Atribua ou mencione um agente num item de trabalho do Nexo. Escolha os projetos e ferramentas conectadas, e revise os resultados com seu time no mesmo lugar.',
                alt: 'Agentes trabalhando ao lado de um time num board do Nexo',
                reverse: true,
              },
              {
                title: 'Dê a cada time uma visão útil',
                description:
                  'Salve views filtradas entre projetos no Nexo pra cada time acompanhar o que importa pra ele. Mantenha requisitos na Wiki, ao lado das tarefas que eles orientam.',
                alt: '',
                reverse: false,
              },
            ].map((item) => (
              <div
                key={item.title}
                className='grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16'
              >
                <div
                  className={`text-start flex flex-col justify-center gap-4 ${item.reverse ? 'lg:order-2' : ''}`}
                >
                  <h5 className='font-normal text-3xl md:whitespace-pre-line'>
                    {item.title}
                  </h5>
                  <Muted className='text-base'>{item.description}</Muted>
                </div>
                <Image
                  src='/web/switch/screenshot-workflows-cards.jpg'
                  alt={item.alt}
                  width={1024}
                  height={1024}
                  className={`rounded-xl border ${item.reverse ? 'lg:order-1' : ''}`}
                />
              </div>
            ))}
          </div>
        </section>
        <SwitchCompareCarousel />
        <SwitchFaq />
      </main>
      <WebFooter />
    </>
  )
}
