import type { Metadata } from 'next'
import Image from 'next/image'
import { WebFooter } from '../_components/footer'

const TITLE = 'Sobre | Nexo'
const DESCRIPTION = 'Por que construímos o Nexo e pra quem ele é feito.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    url: '/about',
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

export default function AboutPage() {
  return (
    <>
      <main className='min-h-dvh w-full flex flex-col items-center flex-1 mx-auto'>
        <div className='flex flex-col items-center text-start mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384 py-16 gap-12'>
          <section className='grid grid-cols-1 items-center gap-20 md:grid-cols-2'>
            <div className='space-y-2'>
              <h3 className='font-normal text-2xl md:whitespace-pre-line'>
                O Nexo existe pra ajudar seu time a fazer o melhor trabalho
                junto, num workspace só.
              </h3>
              <p className='text-base text-muted-foreground'>
                Projetos, conhecimento e IA costumam viver em ferramentas
                separadas — cada uma com sua própria aba, seu próprio login, seu
                próprio contexto perdido.
                <br />
                Reunimos os três num único lugar, pra que gestão de projetos,
                documentação compartilhada e IA falem a mesma língua dentro do
                seu workspace.
                <br />
                Não é sobre ter mais uma ferramenta. É sobre ter uma só que
                realmente acompanha o seu time.
              </p>
            </div>
            <Image
              src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fabout-us-one-workspace-for-all-teams_2%2520(1).webp&w=1920&q=75&dpl=dpl_F6x68kwz9eVd34XwBheHvEp1ELmn'
              alt=''
              width={2465}
              height={2465}
              className='w-full'
            />
          </section>
          <section className='grid grid-cols-1 items-center gap-20 md:grid-cols-2'>
            <div className='space-y-2'>
              <h3 className='font-normal text-2xl md:whitespace-pre-line'>
                O Nexo é a ferramenta que você queria pro seu time, mas nunca
                achou.
              </h3>
              <p className='text-base text-muted-foreground'>
                Você provavelmente já tentou ferramentas pensadas pra um jeito
                de trabalhar que não existe mais — hierárquico,
                departamentalizado, decidido em reunião de diretoria.
                <br />
                Ou tentou as opinativas demais, tão cheias de regras que dava
                vontade de cobrar pela paciência de aprender a usar.
                <br />
                Construímos o Nexo pro meio do caminho: times de 8 a 30 pessoas
                que crescem rápido e não têm tempo pra virar especialista na
                própria ferramenta de trabalho. Essa é a nossa missão, e é ela
                que nos move todos os dias.
              </p>
            </div>
            <Image
              src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fabout-us-one-workspace-for-all-teams_2%2520(1).webp&w=1920&q=75&dpl=dpl_F6x68kwz9eVd34XwBheHvEp1ELmn'
              alt=''
              width={2465}
              height={2465}
              className='w-full'
            />
          </section>
          <section className='grid grid-cols-1 items-center gap-20 md:grid-cols-2'>
            <div className='space-y-2'>
              <h3 className='font-normal text-2xl md:whitespace-pre-line'>
                O caminho até aqui, e o que vem a seguir
              </h3>
              <p className='text-base text-muted-foreground'>
                Começamos a escrever a primeira linha do Nexo em janeiro de
                2026, como um time de duas pessoas.
                <br />
                Hoje, menos de um ano depois, o Nexo já tem gestão de projetos
                completa — kanban, ciclos, calendário e cronograma — e um espaço
                de conhecimento compartilhado, a Wiki, pra tirar mais uma aba da
                rotina do seu time.
                <br />A Nexo AI é a peça mais nova: ainda no começo, mas já
                ajudando a responder perguntas sobre o workspace e enxergar o
                que trava um projeto.
                <br />O que vem a seguir é continuar construindo junto dos
                primeiros times que confiam no Nexo — e deixar a IA cada vez
                mais parte do dia a dia, não só um recurso a mais.
              </p>
            </div>
            <Image
              src='https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fabout-us-one-workspace-for-all-teams_2%2520(1).webp&w=1920&q=75&dpl=dpl_F6x68kwz9eVd34XwBheHvEp1ELmn'
              alt=''
              width={2465}
              height={2465}
              className='w-full'
            />
          </section>
          <section />
        </div>
      </main>
      <WebFooter showBanner={false} />
    </>
  )
}
