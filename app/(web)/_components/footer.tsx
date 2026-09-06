import {
  AndroidIcon,
  Github01Icon,
  LinkedinIcon,
  NewTwitterIcon,
  WindowsOldIcon,
  YoutubeIcon,
} from '@hugeicons-pro/core-solid-rounded'
import Image from 'next/image'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

const CERTS = ['gdpr', 'iso', 'soc2'] as const

export function WebFooter() {
  return (
    <>
      <div className="w-full py-20 bg-cover bg-center bg-no-repeat bg-[url('/home/bg-home.png')]">
        <div className='mx-auto w-full px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384 flex flex-col space-y-10 items-center text-center'>
          <h2 className='text-5xl font-normal md:whitespace-pre-line font-mono leading-[1.3] tracking-[-.03em] text-white'>
            A nova geração da gestão de projetos <br /> começa aqui
          </h2>
          <div className='flex flex-wrap w-full items-center gap-4 justify-center'>
            <Link href='/sign-up'>
              <Button size='lg'>Comece grátis</Button>
            </Link>
            <Link href='/talk-to-sales'>
              <Button variant='secondary' size='lg' className='border-border'>
                Fale com um especialista em migração
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <footer className='w-full bg-surface-highlight space-y-10 py-16'>
        <div className='w-full mx-auto px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 flex items-center justify-between'>
          <Link href='/' className='justify-self-start'>
            <Image
              src='/brand/logo.svg'
              alt='nexo-logo'
              width={100}
              height={45}
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
            <div className='cols-span-1 flex flex-col gap-4 pb-6'>
              <div className='mb-4'>
                <Muted className='font-medium'>Produto</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/projects'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Gestão de projetos
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/wiki'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Wiki
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/nexo-ai'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Nexo AI
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/nexo-compose'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Nexo Compose
                    </Link>
                  </li>
                </ul>
              </div>
              <div className='mb-4'>
                <Muted className='font-medium'>Auto-hospedado</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/self-hosted/commercial'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Edição comercial
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/self-hosted/airgapped'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Edição isolada
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/self-hosted/prime-portal'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Prime Portal
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='cols-span-1 flex flex-col gap-4 pb-6'>
              <div className='mb-4'>
                <Muted className='font-medium'>Funcionalidades</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/features/work-items'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Tarefas
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/work-item-types'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Tipos de tarefa
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/intake'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Entrada de demandas
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/cycles'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Ciclos
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/intake'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Intake
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/workflows'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Fluxos e aprovações
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/epics-initiatives'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Épicos e iniciativas
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/customers'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Clientes
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/dashboards'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Painéis
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/teamspaces'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Espaços de equipe
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/features/project-updates'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Status dos projetos + Atualizações
                    </Link>
                  </li>
                </ul>
              </div>
              <div className='mb-4'>
                <Muted className='font-medium'>Marketplace</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/marketplace/apps'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Apps e agentes
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/marketplace/importers'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Importadores
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/marketplace/templates'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Modelos
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='cols-span-1 flex flex-col gap-4 pb-6'>
              <div className='mb-4'>
                <Muted className='font-medium'>Planos e preços</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/pricing'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Pro
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/pricing'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Business
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/pricing'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Nível empresarial
                    </Link>
                  </li>
                </ul>
              </div>
              <div className='mb-4'>
                <Muted className='font-medium'>Casos de uso</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/solutions/product'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Produto
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/solutions/operations'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Operações
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/solutions/marketing'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Marketing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/solutions/agile'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Ágil
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/solutions/design'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Design
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/solutions/engineering'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Engenharia
                    </Link>
                  </li>
                </ul>
              </div>
              <div className='mb-4'>
                <Muted className='font-medium'>Porte</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/solutions/startups'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Startups
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/solutions/growing-teams'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Equipes em crescimento
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/solutions/enterprise-teams'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Grandes equipes
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='cols-span-1 flex flex-col gap-4 pb-6'>
              <div className='mb-4'>
                <Muted className='font-medium'>Setores</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/industries/aerospace'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Aeroespacial
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/industries/healthcare'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Saúde
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/industries/government'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Governo
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/industries/retail'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Varejo
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/industries/manufacturing'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Indústria
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/industries/defense'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Defesa
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/industries/finance'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Finanças
                    </Link>
                  </li>
                </ul>
              </div>
              <div className='mb-4'>
                <Muted className='font-medium'>Comparativos</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/compare/jira'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Jira
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/compare/asana'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Asana
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/compare/monday'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Monday
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/compare/linear'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Linear
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/compare/clickup'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      ClickUp
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='cols-span-1 flex flex-col gap-4 pb-6'>
              <div className='mb-4'>
                <Muted className='font-medium'>Aprenda</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/blog'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Blog da Nexo
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/changelog'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Novidades (Changelog)
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/download'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Baixar
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/mobile'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Mobile
                    </Link>
                  </li>
                </ul>
              </div>
              <div className='mb-4'>
                <Muted className='font-medium'>Suporte</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/docs'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Documentação
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/docs/api'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Documentação para desenvolvedores
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/status'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Status
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/forum'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Fórum
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='cols-span-1 flex flex-col gap-4 pb-6'>
              <div className='mb-4'>
                <Muted className='font-medium'>Empresa</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/legals/terms'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Termos
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/legals/privacy'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Privacidade
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/legals/security'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Segurança
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/legal'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Jurídico
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/careers'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Carreiras
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/about'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Sobre
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/wallpapers'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Papéis de parede
                    </Link>
                  </li>
                </ul>
              </div>
              <div className='mb-4'>
                <Muted className='font-medium'>Nexo em ação</Muted>
                <ul className='mt-1 space-y-2 text-sm'>
                  <li>
                    <Link
                      href='/manifesto'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Manifesto
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/switch'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Faça a troca
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/talk-to-sales'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Fale com vendas
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/contact'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      Contato geral
                    </Link>
                  </li>
                  <li>
                    <Link
                      href='/customers'
                      className='md:whitespace-pre-line text-primary text-xs font-medium hover:underline'
                    >
                      O que dizem nossos clientes
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
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
            <Link href='https://linkedin.com'>
              <Button
                variant='outline'
                size='icon-lg'
                className="[&_svg:not([class*='size-'])]:size-5"
              >
                <NexoIcon icon={LinkedinIcon} />
              </Button>
            </Link>
            <Link href='#'>
              <Button
                variant='outline'
                size='icon-lg'
                className="[&_svg:not([class*='size-'])]:size-5"
              >
                <NexoIcon icon={Github01Icon} />
              </Button>
            </Link>
            <Link href='#'>
              <Button
                variant='outline'
                size='icon-lg'
                className="[&_svg:not([class*='size-'])]:size-5"
              >
                <NexoIcon icon={NewTwitterIcon} />
              </Button>
            </Link>
            <Link href='#'>
              <Button
                variant='outline'
                size='icon-lg'
                className="[&_svg:not([class*='size-'])]:size-5"
              >
                <NexoIcon icon={YoutubeIcon} />
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </>
  )
}
