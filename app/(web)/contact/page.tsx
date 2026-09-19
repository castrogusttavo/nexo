import {
  BookOpenTextIcon,
  Call02Icon,
  CircleQuestionMarkIcon,
  CodeSquareIcon,
  Mail02Icon,
  MessagesSquareIcon,
} from '@hugeicons-pro/core-solid-rounded'
import type { Metadata } from 'next'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import type { IconType } from '@/components/layouts/list-layout'
import { Button } from '@/components/ui/button'
import { WebFooter } from '../_components/footer'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'

const TITLE = 'Contato | Nexo'
const DESCRIPTION =
  'Vendas, suporte, documentação e outros canais de contato do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/contact' },
  openGraph: {
    type: 'website',
    url: '/contact',
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

interface ContactCard {
  title: string
  description: string
  cta: string
  href: string
  icon: IconType
}

const CONTACT_CARDS: ContactCard[] = [
  {
    title: 'Vendas',
    description:
      'Fale com a gente sobre preços, planos e como migrar de outra ferramenta.',
    cta: 'Falar com vendas',
    href: '/talk-to-sales',
    icon: Call02Icon,
  },
  {
    title: 'Ajuda e suporte',
    description:
      'Fale com o nosso time em tempo real, direto pelo chat dentro do produto.',
    cta: 'Iniciar chat',
    href: '/support',
    icon: CircleQuestionMarkIcon,
  },
  {
    title: 'Fórum',
    description:
      'Tire dúvidas, dê sugestões e converse com outras pessoas usando o Nexo.',
    cta: 'Ir para o fórum',
    href: '/forum',
    icon: MessagesSquareIcon,
  },
  {
    title: 'Documentação',
    description:
      'Guias e referências pra usar o Nexo, do primeiro setup ao dia a dia.',
    cta: 'Ler a documentação',
    href: '/docs',
    icon: BookOpenTextIcon,
  },
  {
    title: 'Desenvolvedores',
    description:
      'Explore a referência da nossa API REST pra construir integrações com o Nexo.',
    cta: 'Ver a API',
    href: '/docs',
    icon: CodeSquareIcon,
  },
  {
    title: 'Outros assuntos',
    description:
      'Parcerias, imprensa ou qualquer outro assunto — é só mandar um e-mail.',
    cta: 'contato@nexopm.com',
    href: 'mailto:contato@nexopm.com',
    icon: Mail02Icon,
  },
]

export default function ContactPage() {
  return (
    <>
      <main className='w-full flex flex-col items-center flex-1 mx-auto'>
        <div className='text-center mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384 py-16 space-y-12'>
          <div className='space-y-4'>
            <Title>Como podemos ajudar?</Title>
            <SubTitle>
              De dúvidas técnicas a parcerias, é só escolher o canal certo
              abaixo.
            </SubTitle>
          </div>
          <div className='grid grid-cols-1 gap-6 text-start sm:grid-cols-2 lg:grid-cols-3'>
            {CONTACT_CARDS.map((card) => (
              <div
                key={card.title}
                className='border border-border flex flex-col justify-between gap-16 rounded-xl p-6 transition bg-card'
              >
                <div className='flex size-10 items-center justify-center rounded-md border border-border'>
                  <NexoIcon icon={card.icon} size={24} />
                </div>
                <div className='space-y-6'>
                  <div className='space-y-2'>
                    <h3 className='font-medium text-lg md:whitespace-pre-line'>
                      {card.title}
                    </h3>
                    <p className='text-base text-muted-foreground'>
                      {card.description}
                    </p>
                  </div>
                  <Link href={card.href}>
                    <Button size='lg'>{card.cta}</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <WebFooter showBanner={false} />
    </>
  )
}
