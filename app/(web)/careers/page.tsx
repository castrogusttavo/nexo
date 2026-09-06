import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { CareerJobService } from '@/src/services/career-job.service'
import { WebFooter } from '../_components/footer'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'
import { CareersFaq } from './careers-faq'
import { CareersList } from './careers-list'

const TITLE = 'Carreiras | Nexo'
const DESCRIPTION = 'Vagas abertas no Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/careers' },
  openGraph: {
    type: 'website',
    url: '/careers',
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

export default async function CareersPage() {
  const result = await CareerJobService.listPublic()
  const jobs = result.ok ? result.value : []

  return (
    <main className='mx-auto w-full flex flex-col items-center gap-10'>
      <div className="w-full flex min-h-[calc(100vh-75px)] flex-col justify-end items-center py-12 md:py-16 bg-cover bg-center bg-no-repeat bg-[url('/home/career-hero-bg.webp')]">
        <div className='w-full flex items-center justify-between pt-20 px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10'>
          <div className='flex flex-col items-start gap-6'>
            <div className='space-y-4'>
              <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
                nexo · careers
              </div>
              <Title>
                Construa a infraestrutura <br />
                em que o trabalho roda
              </Title>
            </div>
            <div className='flex gap-4 items-center flex-wrap justify-start md:justify-center'>
              <Link href='#vagas'>
                <Button size='lg'>Ver vagas abertas</Button>
              </Link>
              <Link href='/work-trials'>
                <Button variant='secondary' size='lg'>
                  Como contratamos
                </Button>
              </Link>
            </div>
          </div>
          <div className='space-y-4 max-w-188'>
            <SubTitle className='text-muted-foreground md:whitespace-pre-line text-lg'>
              O Nexo é a infraestrutura de trabalho do seu time, rodada por
              pessoas e, agora, também por agentes de IA. Na próxima década, os
              times vão reconstruir como planejam, decidem e entregam.
            </SubTitle>
            <SubTitle className='text-muted-foreground md:whitespace-pre-line text-lg'>
              Estamos construindo a camada por baixo de tudo isso — e
              contratando pra formar esse time técnico desde o zero.
            </SubTitle>
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-6 items-center text-start'>
        <div className='space-y-6 max-w-188'>
          <Title>Por que o Nexo, e por que agora</Title>
          <SubTitle>
            Toda geração reconstrói a infraestrutura do trabalho. O papel deu
            lugar ao PC, o PC deu lugar à nuvem, e a cada vez um pequeno grupo
            de times construiu os trilhos que todo mundo mais usa depois. Esse
            momento chegou de novo, e dessa vez os funcionários mais novos não
            são pessoas.
          </SubTitle>
          <SubTitle>
            Agentes estão entrando nos times agora, chegando numa bagunça que a
            gente mesmo criou: trabalho espalhado em ferramentas desconectadas,
            contexto dividido entre issues num lugar, documentos em outro, e
            decisões numa conversa que já rolou pra longe. Pessoas mal conseguem
            lidar com isso. Agentes não conseguem lidar de jeito nenhum, porque
            software só age bem sobre o trabalho que consegue enxergar por
            inteiro.
          </SubTitle>
          <SubTitle>
            Então o problema de infraestrutura da próxima década é esse: colocar
            todo o trabalho de uma empresa num espaço só, onde humanos e agentes
            encontram qualquer coisa, repassam qualquer coisa um pro outro, e
            agem com contexto completo. Isso é o Nexo, e esse é o trabalho.
          </SubTitle>
        </div>
        <figure className='w-fit mb-10 space-y-1.5'>
          <Image
            src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fcareers-today-vs-plane-diagram-desktop-light-ae85c175.webp&w=1920&q=75&dpl=dpl_2PXj42WPnnbKpRZyUAz3F34bLCiL'
            alt='Visão geral do workspace do Nexo'
            width={5024}
            height={2752}
            sizes='100vw'
            priority
            className='max-w-5xl h-auto object-cover object-center rounded-sm'
          />
          <figcaption className='w-full text-center'>
            <Muted className='text-xs whitespace-nowrap'>
              O trabalho vive em ferramentas que não se enxergam. O Nexo dá pra
              humanos e agentes um espaço de coordenadas só.
            </Muted>
          </figcaption>
        </figure>
        <div className='space-y-6 max-w-188'>
          <Title>O que estamos construindo</Title>
          <SubTitle>
            O Nexo nasceu da dor de um fundador tentando juntar contexto
            espalhado entre ClickUp, Notion e Trello, e está virando a
            infraestrutura de trabalho pra qualquer time que sinta a mesma dor —
            de startups pequenas a empresas que preferem rodar tudo na própria
            infraestrutura. É cedo: hoje somos duas pessoas construindo a
            fundação.
          </SubTitle>
          <SubTitle>
            Cinco coisas estão na frente do roadmap: agentes, tanto prontos
            quanto construídos pelos próprios clientes; uma API que outros
            desenvolvedores queiram usar; interfaces desenhadas pras decisões
            que agentes não deveriam tomar; handoffs que funcionam nos dois
            sentidos entre pessoas e agentes; e uma camada de dados que continua
            rápida rodando na infraestrutura do próprio cliente, sob carga real
            de produção.
          </SubTitle>
        </div>
        <figure className='w-fit mb-10 space-y-1.5'>
          <Image
            src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fcareers-five-directions-diagram-desktop-light-10110bda.webp&w=1920&q=75&dpl=dpl_2PXj42WPnnbKpRZyUAz3F34bLCiL'
            alt='Visão geral do workspace do Nexo'
            width={5024}
            height={2752}
            sizes='100vw'
            priority
            className='max-w-5xl h-auto object-cover object-center rounded-sm'
          />
          <figcaption className='w-full text-center'>
            <Muted className='text-xs whitespace-nowrap'>
              Os próximos anos, em cinco direções. Tudo nessa imagem precisa de
              gente pra construir. Uma dessas mãos pode ser a sua.
            </Muted>
          </figcaption>
        </figure>
      </div>
      <div className='w-full'>
        <div className="w-full flex min-h-120 flex-col justify-end gap-32 py-16 md:min-h-140 md:py-24 bg-cover bg-center bg-no-repeat bg-[url('/home/career-workspace-bg.webp')] pb-0">
          <div className='w-full mx-auto px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384'>
            <div className='max-w-md grid grid-cols-2 gap-8'>
              <div className='space-y-2'>
                <Title>2</Title>
                <SubTitle>pessoas formam o time técnico hoje</SubTitle>
              </div>
              <div className='space-y-2'>
                <Title>8-30</Title>
                <SubTitle>
                  pessoas é o tamanho de time que projetamos pra atender
                </SubTitle>
              </div>
              <div className='space-y-2'>
                <Title>1</Title>
                <SubTitle>assinatura só pra projetos, wiki e IA</SubTitle>
              </div>
              <div className='space-y-2'>
                <Title>100%</Title>
                <SubTitle>
                  das contratações passam por work trial remunerado
                </SubTitle>
              </div>
            </div>
          </div>
        </div>
        <div className='w-full bg-surface-highlight py-12 md:py-16'>
          <div className='mx-auto w-full flex flex-col items-center justify-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10 pt-0'>
            <div className='space-y-6 text-center'>
              <Title>Como trabalhamos</Title>
              <SubTitle>
                Seis coisas que você notaria no seu primeiro mês.
              </SubTitle>
            </div>
            <div className='border border-border grid grid-cols-1 overflow-hidden rounded-xl md:grid-cols-2'>
              <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card '>
                <h3 className='font-medium text-lg md:whitespace-pre-line'>
                  Humanos direcionam, sistemas estruturam, agentes executam
                </h3>
                <p className='text-base text-muted-foreground text-start space-y-2'>
                  Rodamos a empresa do jeito que o produto funciona. Agentes
                  cuidam de triagem, agendamento, primeiros rascunhos e resumos
                  aqui dentro, do mesmo jeito que fazem pros clientes. A maior
                  parte da sua semana vai pra decisões.
                </p>
              </div>
              <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
                <h3 className='font-medium text-lg md:whitespace-pre-line'>
                  Commitamos direto na main
                </h3>
                <p className='text-base text-muted-foreground text-start space-y-2'>
                  Sem fila de pull request travando o que você acabou de
                  construir — o CI é a rede de segurança, não uma aprovação em
                  série. Seu primeiro commit sobe pra produção rápido, e alguém
                  que decide com você revisa junto, não uma fila de espera.
                </p>
              </div>
              <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
                <h3 className='font-medium text-lg md:whitespace-pre-line'>
                  Fazemos a hora extra que falta
                </h3>
                <p className='text-base text-muted-foreground text-start space-y-2'>
                  Infraestrutura conquista confiança ao longo de anos e perde
                  numa release ruim. Isso já é motivo suficiente pra fazer certo
                  da primeira vez.
                </p>
              </div>
              <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
                <h3 className='font-medium text-lg md:whitespace-pre-line'>
                  Você é dono do problema inteiro
                </h3>
                <p className='text-base text-muted-foreground text-start space-y-2'>
                  Os times são pequenos e a autonomia é real. Você é dono de um
                  resultado do início ao fim, e apresenta o trabalho você mesmo.
                </p>
              </div>
              <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
                <h3 className='font-medium text-lg md:whitespace-pre-line'>
                  Velocidade de pensamento é a meta
                </h3>
                <p className='text-base text-muted-foreground text-start space-y-2'>
                  Cada tarefa repetitiva que tiramos do caminho aproxima um time
                  de se mover na velocidade em que consegue pensar. Cobramos de
                  nós mesmos o mesmo padrão que construímos pros outros: menos
                  cerimônia, menos handoff, menor distância entre decisão e
                  entrega.
                </p>
              </div>
              <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
                <h3 className='font-medium text-lg md:whitespace-pre-line'>
                  Clientes rodam a gente na própria infraestrutura deles
                </h3>
                <p className='text-base text-muted-foreground text-start space-y-2'>
                  O Nexo roda dentro da infraestrutura do próprio cliente, em
                  máquinas que a gente não enxerga. Segurança e soberania de
                  dados são restrições de engenharia que projetamos desde o
                  início.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className='w-full bg-surface-highlight py-12 md:py-16'>
          <div className='mx-auto w-full flex flex-col items-center justify-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10 pt-0'>
            <div className='space-y-6 text-center'>
              <Title>Quem se dá bem aqui</Title>
              <SubTitle>
                O Nexo combina com um perfil de pessoa, não com todo mundo.
              </SubTitle>
            </div>
            <div className='border border-border grid grid-cols-1 overflow-hidden rounded-xl md:grid-cols-2'>
              <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
                <h3 className='font-medium text-lg md:whitespace-pre-line'>
                  Isso combina com você se
                </h3>
                <ul className='text-base text-muted-foreground text-start space-y-2 list-disc pl-5'>
                  <li>
                    Você quer o problema inteiro, e é a pessoa pra quem os
                    outros entregam a parte difícil.
                  </li>
                  <li>Você percebe os detalhes que os outros deixam passar.</li>
                  <li>
                    Você documenta o raciocínio por trás de cada decisão, não só
                    o resultado.
                  </li>
                  <li>
                    Você quer definir o que significa, na prática, trabalhar
                    lado a lado com agentes de IA.
                  </li>
                </ul>
              </div>
              <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
                <h3 className='font-medium text-lg md:whitespace-pre-line'>
                  Pense duas vezes se
                </h3>
                <ul className='text-base text-muted-foreground text-start space-y-2 list-disc pl-5'>
                  <li>Você prefere ter processo entre você e o resultado.</li>
                  <li>
                    Você prefere trabalhar sem expor o raciocínio por trás das
                    suas decisões.
                  </li>
                  <li>Você prefere terreno já mapeado.</li>
                  <li>
                    Você está esperando a poeira da IA assentar antes de se
                    comprometer com ela.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        id='como-contratamos'
        className='flex flex-col gap-6 items-center text-start scroll-mt-[72px]'
      >
        <div className='space-y-6 max-w-188'>
          <Title>Como funciona a contratação</Title>
          <SubTitle>
            Você se candidata e uma pessoa lê. Conversamos uma ou duas vezes
            sobre trabalho que você já entregou e problemas que temos hoje. Se
            ainda fizer sentido dos dois lados, você faz um work trial
            remunerado: de dois a cinco dias de trabalho real com o time que
            você entraria, encaixado na sua agenda atual.
          </SubTitle>
          <SubTitle>
            Isso vale pra qualquer contratação, de quem vai escrever código a
            quem um dia vier liderar um time. Você é pago independente do
            resultado, e recebe uma decisão com retorno específico em até três
            dias úteis depois do seu último dia de trial.
          </SubTitle>
          <SubTitle>
            Se você já construiu algo publicamente — projeto pessoal,
            contribuição open-source, artigo técnico — isso conta muito na
            conversa, mas não é obrigatório.
          </SubTitle>
        </div>
        <figure className='w-fit mb-10 space-y-1.5'>
          <Image
            src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fcareers-hiring-process-timeline-desktop-light-a118dd89.webp&w=1920&q=75&dpl=dpl_2PXj42WPnnbKpRZyUAz3F34bLCiL'
            alt='Visão geral do workspace do Nexo'
            width={5024}
            height={2752}
            sizes='100vw'
            priority
            className='max-w-5xl h-auto object-cover object-center rounded-sm'
          />
          <figcaption className='w-full text-center'>
            <Muted className='text-xs whitespace-nowrap'>
              O work trial é o coração do processo.
            </Muted>
          </figcaption>
        </figure>
      </div>
      <div id='vagas' className='w-full scroll-mt-[72px]'>
        <CareersList jobs={jobs} />
      </div>
      <div className='w-full bg-surface-highlight py-12 md:py-16'>
        <div className='mx-auto w-full flex flex-col items-center justify-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10 pt-0'>
          <div className='space-y-6 text-center'>
            <Title>Os termos práticos</Title>
          </div>
          <div className='border border-border grid grid-cols-1 overflow-hidden rounded-xl md:grid-cols-2'>
            <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
              <h3 className='font-medium text-lg md:whitespace-pre-line'>
                Equity em toda proposta
              </h3>
              <p className='text-base text-muted-foreground text-start space-y-2'>
                Quem constrói o Nexo é dono de parte do Nexo, nas mesmas
                condições dos fundadores. Toda proposta inclui equity relevante
                — sem tratamento diferente pra quem chegou depois.
              </p>
            </div>
            <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
              <h3 className='font-medium text-lg md:whitespace-pre-line'>
                Como pagamos
              </h3>
              <p className='text-base text-muted-foreground text-start space-y-2'>
                A faixa salarial de uma vaga é a faixa em que contratamos, e não
                pagamos menos pra quem negocia menos.
              </p>
            </div>
            <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
              <h3 className='font-medium text-lg md:whitespace-pre-line'>
                Tempo livre
              </h3>
              <p className='text-base text-muted-foreground text-start space-y-2'>
                Tempo livre que as pessoas realmente tiram, fundadores
                inclusive. Infraestrutura é um jogo longo, e contratamos
                pensando nisso.
              </p>
            </div>
            <div className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'>
              <h3 className='font-medium text-lg md:whitespace-pre-line'>
                Localização
              </h3>
              <p className='text-base text-muted-foreground text-start space-y-2'>
                O trabalho é 100% remoto — não importa de onde você é, contanto
                que a colaboração funcione.
              </p>
            </div>
          </div>
          <div className='space-y-2 text-center max-w-2xl'>
            <Title as='h3' className='text-2xl font-medium'>
              Você sempre recebe uma resposta
            </Title>
            <SubTitle>
              Respondemos toda candidatura, damos retorno específico depois de
              cada work trial, e colocamos números honestos na mesa na hora da
              proposta.
            </SubTitle>
          </div>
        </div>
      </div>
      <CareersFaq />
      <WebFooter />
    </main>
  )
}
