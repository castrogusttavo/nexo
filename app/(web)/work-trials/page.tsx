import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { WebFooter } from '../_components/footer'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'
import { WorkTrialsFaq } from './work-trials-faq'

const TITLE = 'Work trials | Nexo'
const DESCRIPTION = 'Como funciona o work trial remunerado do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/work-trials' },
  openGraph: {
    type: 'website',
    url: '/work-trials',
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

const COMMITMENTS = [
  {
    title: 'Sempre remunerado',
    description:
      'Todo trial é pago, numa taxa que colocamos por escrito antes de você decidir qualquer coisa, e o pagamento nunca depende do resultado.',
  },
  {
    title: 'Sua agenda',
    description:
      'Dias, noites, fins de semana, blocos separados, no seu fuso horário. Você escolhe o formato, e isso não afeta a avaliação.',
  },
  {
    title: 'Seu emprego atual continua seguro',
    description:
      'Nunca entramos em contato com seu empregador atual, e a confidencialidade vale nos dois sentidos, por escrito, antes de você começar.',
  },
  {
    title: 'O time que você entraria',
    description:
      'Você trabalha com as pessoas que se juntaria, em trabalho que importa pra elas, nas mesmas ferramentas e canais.',
  },
  {
    title: 'Dimensionado pra avaliação',
    description:
      'Terminável nos dias que você tem. Não usamos trial pra conseguir trabalho barato.',
  },
  {
    title: 'Uma resposta rápida e honesta',
    description:
      'Uma decisão em até três dias úteis depois do seu último dia, com retorno específico sobre o seu trabalho.',
  },
  {
    title: 'Um caminho alternativo',
    description:
      'Se um trial remunerado for impossível pra você, desenhamos outro jeito de chegar na mesma evidência. Precisar disso nunca conta contra você.',
  },
  {
    title: 'Também é normal dizer não',
    description:
      'Se o trial te convencer que esse não é o lugar certo, desistir é um bom resultado. Você continua sendo pago, e a gente se separa em bons termos.',
  },
]

export default function WorkTrialsPage() {
  return (
    <main className='mx-auto w-full flex flex-col items-center gap-10'>
      <div className="w-full flex min-h-[calc(100vh-75px)] flex-col justify-end items-center py-12 md:py-16 bg-cover bg-center bg-no-repeat bg-[url('/home/work-trials-hero-bg.webp')]">
        <div className='w-full flex items-center justify-between pt-20 px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10'>
          <div className='flex flex-col items-start gap-6'>
            <div className='space-y-4'>
              <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
                nexo · work trials
              </div>
              <Title>
                A melhor entrevista é <br />
                alguns dias de trabalho de verdade
              </Title>
            </div>
            <div className='flex gap-4 items-center flex-wrap justify-start md:justify-center'>
              <Link href='/careers#vagas'>
                <Button size='lg'>Ver vagas abertas</Button>
              </Link>
            </div>
          </div>
          <div className='space-y-4 max-w-188'>
            <SubTitle className='text-neutral-200 md:whitespace-pre-line text-lg'>
              A última etapa da contratação no Nexo é um work trial remunerado.
              Você pega um projeto recortado do nosso ciclo atual e trabalha com
              o time que entraria, com o valor combinado por escrito antes de
              começar.
            </SubTitle>
            <SubTitle className='text-neutral-200 md:whitespace-pre-line text-lg'>
              Essa página conta como funciona, e o que a gente se compromete a
              cumprir.
            </SubTitle>
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-6 items-center text-start'>
        <div className='space-y-6 max-w-188'>
          <Title as='h2'>Por que fazemos work trial</Title>
          <SubTitle>
            Levamos a entrevista a sério. Uma hora de conversa mostra como você
            pensa sobre o seu trabalho e como você explica isso.
          </SubTitle>
          <SubTitle>
            Só que isso não mostra como você lida com um problema que ninguém
            ensaiou, nem como você trabalha com outras pessoas enquanto as
            coisas ainda estão incertas. É sabido que gente que entrevista mal
            pode ser excelente no trabalho, e gente que entrevista bem pode não
            entregar.
          </SubTitle>
          <SubTitle>
            Uma contratação errada nos atrasa um trimestre inteiro. Pra você, é
            um emprego — às vezes uma mudança de cidade — gasto em algo que não
            era bem o que parecia. Então, antes de qualquer um de nós se
            comprometer, trabalhamos juntos por alguns dias, e pagamos pelo
            tempo.
          </SubTitle>
        </div>
        <figure className='w-fit mb-10 space-y-1.5'>
          <Image
            src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fwork-trials-hiring-signal-diagram-desktop-light-fb209a0e.png&w=1920&q=75&dpl=dpl_3Wsu3iwadT68TMCFAUrpQgt8P9Q8'
            alt='Visão geral do workspace do Nexo'
            width={5024}
            height={2752}
            sizes='100vw'
            priority
            className='max-w-5xl h-auto object-cover object-center rounded-sm'
          />
        </figure>
      </div>

      <div className='flex flex-col gap-6 items-center text-start'>
        <div className='space-y-6 max-w-188'>
          <Title as='h2'>Os dois lados estão decidindo</Title>
          <SubTitle>
            Uma entrevista é uma atuação nos dois sentidos. Você chega com as
            suas melhores histórias e a gente chega com a nossa melhor cara — e
            a nossa página de carreiras mostra as partes boas, como a de
            qualquer empresa.
          </SubTitle>
          <SubTitle>
            Um trial tira boa parte dessa encenação. Você lê o código de verdade
            ou entra na pipeline de verdade, vê como as decisões são tomadas e
            como os desacordos são resolvidos, e conhece as pessoas com quem
            trabalharia numa semana normal.
          </SubTitle>
          <SubTitle>
            No último dia, nenhum dos dois lados está mais adivinhando. Se
            fizermos uma proposta, você aceita sabendo como é a segunda-feira.
            Se você recusar depois de ver o lugar de perto, o processo cumpriu o
            papel dele.
          </SubTitle>
        </div>
        <figure className='w-fit mb-10 space-y-1.5'>
          <Image
            src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fwork-trials-two-way-evaluation-diagram-desktop-light-28edd898.png&w=1920&q=75&dpl=dpl_3Wsu3iwadT68TMCFAUrpQgt8P9Q8'
            alt='Visão geral do workspace do Nexo'
            width={5024}
            height={2752}
            sizes='100vw'
            priority
            className='max-w-5xl h-auto object-cover object-center rounded-sm'
          />
        </figure>
      </div>

      <div className='flex flex-col gap-6 items-center text-start'>
        <div className='space-y-6 max-w-188'>
          <Title as='h2'>Como funciona um trial</Title>
          <SubTitle>
            Antes de começar, combinamos o escopo, colocamos a remuneração exata
            por escrito, e assinamos um acordo curto cobrindo pagamento e
            confidencialidade dos dois lados. Você entra configurado como parte
            do time: o repositório ou os arquivos de design, as conversas,
            acesso ao próprio Nexo. Você roda o projeto dentro do produto que
            ajudaria a construir.
          </SubTitle>
          <SubTitle>
            O primeiro dia é um kick-off. Depois disso, os check-ins são seus
            pra agendar e conduzir, porque o que queremos ver é como você conduz
            um trabalho. Reserve tempo pra sua família, mantenha seus
            compromissos, pare numa hora razoável.
          </SubTitle>
          <SubTitle>
            No último dia, você apresenta pro time o que construiu e por que
            tomou as decisões que tomou. Todo mundo que trabalhou com você
            registra sua opinião. Decidimos em até três dias úteis, pagamos por
            todo dia agendado independente do resultado, e o retorno é
            específico sobre o seu trabalho.
          </SubTitle>
        </div>
        <figure className='w-fit mb-10 space-y-1.5'>
          <Image
            src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fwork-trials-trial-timeline-diagram-desktop-light-8830da29.png&w=1920&q=75&dpl=dpl_3Wsu3iwadT68TMCFAUrpQgt8P9Q8'
            alt='Visão geral do workspace do Nexo'
            width={5024}
            height={2752}
            sizes='100vw'
            priority
            className='max-w-5xl h-auto object-cover object-center rounded-sm'
          />
        </figure>
      </div>

      <div className='flex flex-col gap-6 items-center text-start'>
        <div className='space-y-6 max-w-188'>
          <Title as='h2'>Encaixado na sua vida</Title>
          <SubTitle>
            A maioria das pessoas que faz trial com a gente já tem um emprego, e
            muitas têm filhos, escola ou outra coisa que não pausa pra um
            processo seletivo. O trial se encaixa nisso.
          </SubTitle>
          <SubTitle>
            Dias seguidos, noites ao longo de duas semanas, ou fins de semana,
            se isso proteger seu emprego atual. A gente ajusta pro seu fuso
            horário e quebra qualquer dia em blocos. O formato que você escolhe
            não afeta a avaliação nem o quanto você demora pra ter uma resposta.
          </SubTitle>
          <SubTitle>
            Se um trial remunerado for impossível — por causa de visto ou de um
            contrato que você assinou — nos avise, e desenhamos outro caminho
            pra chegar na mesma evidência. Precisar disso não conta contra você.
          </SubTitle>
        </div>
        <figure className='w-fit mb-10 space-y-1.5'>
          <Image
            src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fwork-trials-trial-schedule-grid-diagram-desktop-light-4ce00e19.png&w=1920&q=75&dpl=dpl_3Wsu3iwadT68TMCFAUrpQgt8P9Q8'
            alt='Visão geral do workspace do Nexo'
            width={5024}
            height={2752}
            sizes='100vw'
            priority
            className='max-w-5xl h-auto object-cover object-center rounded-sm'
          />
        </figure>
      </div>

      <div className='flex flex-col gap-6 items-center text-start'>
        <div className='space-y-6 max-w-188'>
          <Title as='h2'>No que você vai trabalhar</Title>
          <SubTitle>
            O projeto é dimensionado pra avaliação, não pra produção. Você é
            pago por tudo, e avisamos de antemão o que acontece com o que você
            produzir.
          </SubTitle>
          <SubTitle>
            É um problema recortado do nosso ciclo atual. Dependendo da vaga,
            pode ser um pedaço do motor de sincronização da wiki ou do editor,
            uma superfície onde uma pessoa repassa trabalho pra um agente, um
            fluxo de design com restrições reais de produção, ou um segmento de
            cliente com os números por trás. Você vai ver o roadmap, os padrões
            e a bagunça, porque não dá pra avaliar honestamente uma empresa que
            foi arrumada pra visita.
          </SubTitle>
        </div>
      </div>

      <div className='w-full bg-surface-highlight py-12 md:py-16'>
        <div className='mx-auto w-full flex flex-col items-center justify-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10 pt-0'>
          <div className='space-y-6 text-center'>
            <Title as='h2'>Os oito compromissos</Title>
            <SubTitle>
              Isso vale pra todo trial e toda vaga. Se a gente falhar em algum{' '}
              <br />
              desses pontos, escreva pra{' '}
              <Link
                href='mailto:vagas@nexo.coodee.dev'
                className='text-branding-600 dark:text-branding-400'
              >
                vagas@nexo.coodee.dev
              </Link>{' '}
              que alguém vai resolver.
            </SubTitle>
          </div>
          <div className='border border-border grid grid-cols-1 overflow-hidden rounded-xl md:grid-cols-2'>
            {COMMITMENTS.map((commitment) => (
              <div
                key={commitment.title}
                className='border border-border flex flex-col gap-3 p-6 md:p-8 bg-card'
              >
                <h3 className='font-medium text-lg md:whitespace-pre-line'>
                  {commitment.title}
                </h3>
                <p className='text-base text-muted-foreground text-start space-y-2'>
                  {commitment.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WorkTrialsFaq />
      <WebFooter />
    </main>
  )
}
