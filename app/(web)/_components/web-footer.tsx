import {
  AndroidIcon,
  Github01Icon,
  InstagramIcon,
  LinkedinIcon,
  WindowsOldIcon,
} from '@hugeicons-pro/core-solid-rounded'
import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink } from '@/components/button-link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

const CERTS = ['gdpr', 'iso', 'soc2'] as const

interface FooterLink {
  href: string
  label: string
}

interface FooterGroup {
  title: string
  links: FooterLink[]
}

const FOOTER_COLUMNS: FooterGroup[][] = [
  [
    {
      title: 'Produto',
      links: [
        { href: '/projects', label: 'Gestão de projetos' },
        { href: '/wiki', label: 'Wiki' },
        { href: '/nexo-ai', label: 'Nexo AI' },
        { href: '/nexo-compose', label: 'Nexo Compose' },
      ],
    },
  ],
  [
    {
      title: 'Marketplace',
      links: [
        { href: '/marketplace/apps', label: 'Apps e agentes' },
        { href: '/marketplace/importers', label: 'Importadores' },
        { href: '/marketplace/templates', label: 'Modelos' },
      ],
    },
  ],
  [
    {
      title: 'Planos e preços',
      links: [
        { href: '/pricing', label: 'Pro' },
        { href: '/pricing', label: 'Business' },
        { href: '/pricing', label: 'Nível empresarial' },
      ],
    },
    {
      title: 'Casos de uso',
      links: [
        { href: '/solutions/product', label: 'Produto' },
        { href: '/solutions/operations', label: 'Operações' },
        { href: '/solutions/marketing', label: 'Marketing' },
        { href: '/solutions/agile', label: 'Ágil' },
        { href: '/solutions/design', label: 'Design' },
        { href: '/solutions/engineering', label: 'Engenharia' },
      ],
    },
    {
      title: 'Porte',
      links: [
        { href: '/solutions/startups', label: 'Startups' },
        { href: '/solutions/growing-teams', label: 'Equipes em crescimento' },
        { href: '/solutions/enterprise-teams', label: 'Grandes equipes' },
      ],
    },
  ],
  [
    {
      title: 'Setores',
      links: [
        { href: '/industries/aerospace', label: 'Aeroespacial' },
        { href: '/industries/healthcare', label: 'Saúde' },
        { href: '/industries/government', label: 'Governo' },
        { href: '/industries/retail', label: 'Varejo' },
        { href: '/industries/manufacturing', label: 'Indústria' },
        { href: '/industries/defense', label: 'Defesa' },
        { href: '/industries/finance', label: 'Finanças' },
      ],
    },
    {
      title: 'Comparativos',
      links: [
        { href: '/compare/jira', label: 'Jira' },
        { href: '/compare/asana', label: 'Asana' },
        { href: '/compare/monday', label: 'Monday' },
        { href: '/compare/linear', label: 'Linear' },
        { href: '/compare/clickup', label: 'ClickUp' },
      ],
    },
  ],
  [
    {
      title: 'Aprenda',
      links: [
        { href: '/blog', label: 'Blog da Nexo' },
        { href: '/changelog', label: 'Novidades (Changelog)' },
        { href: '/download', label: 'Baixar' },
        { href: '/mobile', label: 'Mobile' },
      ],
    },
    {
      title: 'Suporte',
      links: [
        { href: '/docs', label: 'Documentação' },
        { href: '/docs/api', label: 'Documentação para desenvolvedores' },
        { href: '/status', label: 'Status' },
        { href: '/forum', label: 'Fórum' },
      ],
    },
  ],
  [
    {
      title: 'Empresa',
      links: [
        { href: '/legals/terms-and-conditions', label: 'Termos' },
        { href: '/legals/privacy-policy', label: 'Privacidade' },
        { href: '/security', label: 'Segurança' },
        { href: '/legals', label: 'Jurídico' },
        { href: '/careers', label: 'Carreiras' },
        { href: '/about', label: 'Sobre' },
        { href: '/wallpapers', label: 'Papéis de parede' },
      ],
    },
    {
      title: 'Nexo em ação',
      links: [
        { href: '/manifesto', label: 'Manifesto' },
        { href: '/switch', label: 'Faça a troca' },
        { href: '/talk-to-sales', label: 'Fale com vendas' },
        { href: '/contact', label: 'Contato geral' },
        { href: '/customers', label: 'O que dizem nossos clientes' },
      ],
    },
  ],
]

const SOCIALS = [
  {
    href: 'https://www.linkedin.com/company/nexoso',
    label: 'Nexo no LinkedIn',
    icon: LinkedinIcon,
  },
  {
    href: 'https://www.instagram.com/nexopmapp',
    label: 'Nexo no Instagram',
    icon: InstagramIcon,
  },
  {
    href: 'https://github.com/castrogusttavo/nexo',
    label: 'Nexo no GitHub',
    icon: Github01Icon,
  },
]

interface WebFooterProps {
  showBanner?: boolean
}

export function WebFooter({ showBanner = true }: WebFooterProps = {}) {
  return (
    <div className='w-full'>
      {showBanner && <WebFooterBanner />}
      <footer className='w-full bg-surface-highlight space-y-10 py-16'>
        <div className='w-full mx-auto px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 flex flex-col md:flex-row gap-4 justify-between'>
          <Link href='/' className='justify-self-start'>
            <Image
              src='/brand/logo.svg'
              alt='nexo-logo'
              width={100}
              height={45}
              className='invert dark:invert-0'
            />
          </Link>
          <div className='flex gap-2.5'>
            {CERTS.map((cert: 'gdpr' | 'iso' | 'soc2') => (
              <div key={cert} className='flex items-center justify-center'>
                <span
                  role='img'
                  aria-label={cert.toUpperCase()}
                  className='size-16 bg-muted-foreground transition-colors hover:bg-primary'
                  style={{
                    maskImage: `url(/certification/${cert}.svg)`,
                    WebkitMaskImage: `url(/certification/${cert}.svg)`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className='w-full mx-auto px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384'>
          <div className='grid w-full grid-cols-2 gap-8 lg:grid-cols-3 xl:grid-cols-6'>
            {FOOTER_COLUMNS.map((groups) => (
              <div
                key={groups[0].title}
                className='cols-span-1 flex flex-col gap-4 pb-6'
              >
                {groups.map((group) => (
                  <WebFooterGroup key={group.title} group={group} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <hr />
        <div className='w-full mx-auto px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 flex items-center justify-between gap-6 flex-wrap'>
          <div className='hidden md:flex flex-wrap items-center justify-center gap-4 text-center md:justify-start'>
            <Button variant='outline' size='lg'>
              <NexoIcon icon={WindowsOldIcon} />
              Baixar para Windows
            </Button>
            <Button variant='outline' size='lg'>
              <NexoIcon icon={AndroidIcon} />
              Baixar para Android
            </Button>
          </div>
          <div className='flex items-center gap-4'>
            {SOCIALS.map((social) => (
              <ButtonLink
                key={social.href}
                href={social.href}
                variant='outline'
                size='icon-lg'
                className="[&_svg:not([class*='size-'])]:size-5"
                aria-label={social.label}
              >
                <NexoIcon icon={social.icon} />
              </ButtonLink>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

function WebFooterBanner() {
  return (
    <div className="hidden md:block w-full py-20 bg-cover bg-center bg-no-repeat bg-[url('/web/home/bg-home.png')]">
      <div className='mx-auto w-full px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384 flex flex-col space-y-10 items-center text-center'>
        <h2 className='text-5xl font-normal md:whitespace-pre-line font-mono leading-[1.3] tracking-[-.03em] text-white'>
          A nova geração da gestão de projetos <br /> começa aqui
        </h2>
        <div className='flex flex-wrap w-full items-center gap-4 justify-center'>
          <ButtonLink
            href='/talk-to-sales'
            variant='secondary'
            size='lg'
            className='border-border'
          >
            Fale com um especialista em migração
          </ButtonLink>
          <ButtonLink href='/sign-up' size='lg'>
            Comece grátis
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}

function WebFooterGroup({ group }: { group: FooterGroup }) {
  return (
    <div className='mb-4'>
      <Muted className='font-medium'>{group.title}</Muted>
      <ul className='mt-1 space-y-2 text-sm'>
        {group.links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
