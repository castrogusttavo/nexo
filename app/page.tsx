import { ArrowRight02Icon, CheckIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { WebHeader } from '@/app/(web)/_components/header/web-header'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { auth } from '@/src/lib/auth'
import { MembershipService } from '@/src/services/membership.service'
import { WebFooter } from './(web)/_components/footer'
import { NexoAiShowcase } from './(web)/_components/nexo-ai-showcase'

export const metadata: Metadata = {
  title: 'Nexo — gestão de projetos nativa em IA para o seu time',
  description:
    'Nexo une projetos, documentação e IA num só workspace, para o seu time planejar, executar e manter o contexto sem trocar de ferramenta.',
}

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    const memberships = await MembershipService.listByUser(session.user.id)
    if (memberships.ok && memberships.value.length > 0) {
      redirect(`/${memberships.value[0].workspace.slug}`)
    }
    redirect('/onboarding')
  }

  // Deslogado: serve o site de marketing na raiz
  return (
    <div className='min-h-dvh w-full flex flex-col items-center'>
      <WebHeader />
      <main className='w-full h-full flex-1 mx-auto'>
        <section className='flex flex-col items-center text-center mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384'>
          <div className='py-16 flex flex-col gap-4 md:gap-8 items-start text-left md:items-center md:text-center xl:max-w-336 2xl:max-w-384'>
            <div className='space-y-4'>
              <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
                pronto para cloud, self-hosted ou air-gapped
              </div>
              <h1 className='md:whitespace-pre-line font-mono font-normal text-5xl leading-[1.3] tracking-[-.03em]'>
                Gestão de projetos e conhecimento <br />
                para equipes humanas e agentes de IA
              </h1>
              <p className='text-muted-foreground md:whitespace-pre-line text-lg'>
                O Nexo reúne projetos, documentação e fluxos com IA em um único{' '}
                <br />
                espaço, para que times e agentes planejem, executem e avancem
                alinhados.
              </p>
            </div>
            <div className='flex gap-4 items-center flex-wrap justify-start md:justify-center'>
              <Link href='/sign-up'>
                <Button size='lg'>Comece grátis por 14 dias</Button>
              </Link>
              <Link href='/talk-to-sales'>
                <Button variant='outline' size='lg'>
                  Falar com um especialista{' '}
                  <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
                </Button>
              </Link>
            </div>
          </div>
          <Image
            src='/home/bg-home.png'
            alt='Visão geral do workspace do Nexo'
            width={5024}
            height={2752}
            sizes='100vw'
            priority
            className='w-full h-auto object-cover object-center rounded-4xl'
          />
        </section>
        <section className='flex flex-col items-center text-center mx-auto w-full py-20 gap-12 xl:max-w-336 xl:px-11 2xl:max-w-384'>
          <div className='space-y-3'>
            <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
              a plataforma
            </div>
            <h1 className='md:whitespace-pre-line font-mono font-normal text-5xl leading-[1.3] tracking-[-.03em]'>
              Tudo que o seu time precisa <br /> no mesmo workspace
            </h1>
          </div>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <div className='bg-card rounded-lg border border-border flex flex-col duration-300 hover:scale-101 cursor-pointer overflow-hidden'>
              <div className='space-y-3 p-5 pt-4 md:p-8 md:pt-7'>
                <div className='flex flex-col gap-3 text-start'>
                  <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4 font-medium'>
                    projetos
                  </div>
                  <div className='space-y-1.5'>
                    <h3 className='font-semibold text-lg md:whitespace-pre-line'>
                      Decisões que não se perdem no caminho
                    </h3>
                    <Muted className='text-base font-normal'>
                      Iniciativas dão a direção, projetos e ciclos organizam o
                      passo a passo — e o porquê de cada decisão fica
                      registrado, não só na cabeça de quem decidiu.
                    </Muted>
                  </div>
                </div>
              </div>
              <div className='mt-auto w-full pt-1 pl-5 md:pl-8'>
                <Image
                  src='/home/bg-home.png'
                  alt='Visão geral da gestão de projetos do Nexo'
                  width={5024}
                  height={2752}
                  sizes='100vw'
                  priority
                  className='w-full h-auto object-cover object-center rounded-tl-4xl relative hidden aspect-584/320 overflow-hidden md:block'
                />
              </div>
            </div>
            <div className='bg-card rounded-lg border border-border flex flex-col duration-300 hover:scale-101 cursor-pointer overflow-hidden'>
              <div className='space-y-3 p-5 pt-4 md:p-8 md:pt-7'>
                <div className='flex flex-col gap-3 text-start'>
                  <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4 font-medium'>
                    wiki
                  </div>
                  <div className='space-y-1.5'>
                    <h3 className='font-semibold text-lg md:whitespace-pre-line'>
                      A wiki que não morre em três meses
                    </h3>
                    <Muted className='text-base font-normal'>
                      O conhecimento do time em um só lugar, conectado ao
                      trabalho que o gerou. Sempre atualizado, nunca perdido.
                    </Muted>
                  </div>
                </div>
              </div>
              <div className='mt-auto w-full pt-1 pl-5 md:pl-8'>
                <Image
                  src='/home/bg-home.png'
                  alt='Visão geral da wiki do Nexo'
                  width={5024}
                  height={2752}
                  sizes='100vw'
                  className='w-full h-auto object-cover object-center rounded-tl-4xl relative hidden aspect-584/320 overflow-hidden md:block'
                />
              </div>
            </div>
            <div className='bg-card rounded-lg border border-border flex flex-col duration-300 hover:scale-101 cursor-pointer overflow-hidden'>
              <div className='space-y-3 p-5 pt-4 md:p-8 md:pt-7'>
                <div className='flex flex-col gap-3 text-start'>
                  <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4 font-medium'>
                    nexo ai
                  </div>
                  <div className='space-y-1.5'>
                    <h3 className='font-semibold text-lg md:whitespace-pre-line'>
                      Uma IA que conhece o seu trabalho, não só o seu prompt
                    </h3>
                    <Muted className='text-base font-normal'>
                      Sem colar contexto, sem trocar de aba: a IA já enxerga o
                      projeto, a issue e a decisão que está na wiki.
                    </Muted>
                  </div>
                </div>
              </div>
              <div className='mt-auto w-full pt-1 pl-5 md:pl-8'>
                <Image
                  src='/home/bg-home.png'
                  alt='Visão geral do Nexo AI'
                  width={5024}
                  height={2752}
                  sizes='100vw'
                  className='w-full h-auto object-cover object-center rounded-tl-4xl relative hidden aspect-584/320 overflow-hidden md:block'
                />
              </div>
            </div>
            <div className='bg-card rounded-lg border border-border flex flex-col duration-300 hover:scale-101 cursor-pointer overflow-hidden'>
              <div className='space-y-3 p-5 pt-4 md:p-8 md:pt-7'>
                <div className='flex flex-col gap-3 text-start'>
                  <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4 font-medium'>
                    integrações
                  </div>
                  <div className='space-y-1.5'>
                    <h3 className='font-semibold text-lg md:whitespace-pre-line'>
                      Sem reconstruir contexto toda vez que troca de ferramenta
                    </h3>
                    <Muted className='text-base font-normal'>
                      Slack, GitHub e GitLab conectados ao mesmo workspace — a
                      atualização chega onde o trabalho já está, sem exportar,
                      sem copiar e colar.
                    </Muted>
                  </div>
                </div>
              </div>
              <div className='mt-auto w-full pt-1 pl-5 md:pl-8'>
                <Image
                  src='/home/bg-home.png'
                  alt='Visão geral das integrações do Nexo'
                  width={5024}
                  height={2752}
                  sizes='100vw'
                  className='w-full h-auto object-cover object-center rounded-tl-4xl relative hidden aspect-584/320 overflow-hidden md:block'
                />
              </div>
            </div>
          </div>
        </section>
        <section className='flex flex-col items-center bg-surface-highlight w-full'>
          <div className='w-full space-y-12 xl:max-w-336 xl:px-11 2xl:max-w-384 mx-auto py-20'>
            <div className='space-y-6 text-start'>
              <div className='space-y-4 text-start'>
                <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
                  nexo ai
                </div>
                <div className='space-y-3'>
                  <h2 className='md:whitespace-pre-line font-mono font-normal text-4xl leading-[1.3] tracking-[-.03em]'>
                    Uma IA que funciona porque conhece o contexto do seu time
                  </h2>
                  <p className='text-muted-foreground md:whitespace-pre-line text-lg'>
                    O Nexo não colou IA em cima do que já existia — foi
                    construído ao redor dela. <br />A Nexo AI lê o projeto, o
                    ciclo, o doc e a conversa que já estão no seu workspace, sem
                    você colar nada.
                  </p>
                </div>
              </div>
              <div className='flex gap-4 items-center flex-wrap justify-start'>
                <Link href='/sign-up'>
                  <Button size='lg'>Comece grátis</Button>
                </Link>
                <Link href='/talk-to-sales'>
                  <Button variant='outline' size='lg'>
                    Falar com um humano{' '}
                    <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
                  </Button>
                </Link>
              </div>
            </div>
            <NexoAiShowcase />
          </div>
        </section>
        <section className='flex flex-col items-center text-center mx-auto w-full py-20 gap-12 xl:max-w-336 xl:px-11 2xl:max-w-384'>
          <div className='flex flex-col items-center gap-6'>
            <div className='space-y-4'>
              <h2 className='md:whitespace-pre-line font-mono font-normal text-4xl leading-[1.3] tracking-[-.03em]'>
                Saia do Jira, Linear ou ClickUp <br />
                sem perder nada pelo caminho
              </h2>
              <p className='text-muted-foreground md:whitespace-pre-line text-lg'>
                Deixe Jira, Linear, ClickUp, Asana ou Monday sem abandonar seus
                dados. <br />
                Suporte completo de migração desde o primeiro dia, do seu time
                de 10 ao de 100 pessoas.
              </p>
            </div>
            <div className='flex gap-4 items-center flex-wrap justify-start'>
              <Link href='/sign-up'>
                <Button size='lg'>Comece grátis</Button>
              </Link>
              <Link href='/talk-to-sales'>
                <Button variant='outline' size='lg'>
                  Falar com um humano{' '}
                  <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
                </Button>
              </Link>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
            <div className='border-l border-border space-y-12 p-6'>
              <div className='text-start space-y-2'>
                <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
                  semana 1
                </div>
                <h4 className='font-medium text-lg md:whitespace-pre-line'>
                  Mapeamento e planejamento
                </h4>
              </div>
              <ul className='text-base text-muted-foreground text-start space-y-2'>
                <li className='flex items-start gap-2.5'>
                  <NexoIcon icon={CheckIcon} strokeWidth={2} size={20} />
                  Entendemos o que você usa hoje: board, docs e automações
                </li>
                <li className='flex items-start gap-2.5'>
                  <NexoIcon icon={CheckIcon} strokeWidth={2} size={20} />
                  Mapeamos issues, comentários e anexos que precisam vir junto
                </li>
                <li className='flex items-start gap-2.5'>
                  <NexoIcon icon={CheckIcon} strokeWidth={2} size={20} />
                  Você recebe um plano de migração feito pro seu time
                </li>
              </ul>
            </div>
            <div className='border-l border-border space-y-12 p-6'>
              <div className='text-start space-y-2'>
                <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
                  semana 2
                </div>
                <h4 className='font-medium text-lg md:whitespace-pre-line'>
                  Importação e configuração
                </h4>
              </div>
              <ul className='text-base text-muted-foreground text-start space-y-2'>
                <li className='flex items-start gap-2.5'>
                  <NexoIcon icon={CheckIcon} strokeWidth={2} size={20} />
                  Trazemos seus dados de Notion, Confluence, Jira ou uma
                  planilha
                </li>
                <li className='flex items-start gap-2.5'>
                  <NexoIcon icon={CheckIcon} strokeWidth={2} size={20} />
                  Conectamos ao Slack, GitHub e GitLab que você já usa
                </li>
                <li className='flex items-start gap-2.5'>
                  <NexoIcon icon={CheckIcon} strokeWidth={2} size={20} />
                  Configuramos fluxos que batem com o jeito que o seu time
                  trabalha
                </li>
              </ul>
            </div>
            <div className='border-l border-border space-y-12 p-6'>
              <div className='text-start space-y-2'>
                <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
                  semana 3
                </div>
                <h4 className='font-medium text-lg md:whitespace-pre-line'>
                  Onboarding e operação
                </h4>
              </div>
              <ul className='text-base text-muted-foreground text-start space-y-2'>
                <li className='flex items-start gap-2.5'>
                  <NexoIcon icon={CheckIcon} strokeWidth={2} size={20} />
                  Seu time começa a operar no Nexo com suporte direto
                </li>
                <li className='flex items-start gap-2.5'>
                  <NexoIcon icon={CheckIcon} strokeWidth={2} size={20} />A Nexo
                  AI já enxerga o histórico que você trouxe
                </li>
                <li className='flex items-start gap-2.5'>
                  <NexoIcon icon={CheckIcon} strokeWidth={2} size={20} />
                  Você para de pagar por ferramentas que não se falam
                </li>
              </ul>
            </div>
          </div>
        </section>
        <section className='flex flex-col items-center text-center mx-auto w-full py-20 gap-12 xl:max-w-336 xl:px-11 2xl:max-w-384'>
          <div className='flex flex-col items-start gap-6'>
            <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
              capacidades
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-2 space-y-3 items-start'>
              <h2 className='md:whitespace-pre-line font-mono font-normal text-4xl leading-[1.3] tracking-[-.03em] text-start'>
                Recursos flexíveis, pra qualquer projeto e qualquer time
              </h2>
              <p className='text-muted-foreground md:whitespace-pre-line text-lg text-start'>
                O Nexo é rápido de configurar e fácil de adaptar. <br />
                Múltiplas visões, ciclos com prazo definido, documentação
                embutida e dashboards em tempo real, pro seu time planejar e
                entregar sem brigar com a ferramenta.
              </p>
            </div>
            <div className='flex gap-4 items-center flex-wrap justify-start'>
              <Link href='/sign-up'>
                <Button size='lg'>Comece grátis</Button>
              </Link>
              <Link href='/talk-to-sales'>
                <Button variant='outline' size='lg'>
                  Falar com um humano{' '}
                  <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
                </Button>
              </Link>
            </div>
          </div>
          <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <div className='h-full rounded-xl bg-cover bg-center p-6 pb-0 text-start bg-card flex flex-col gap-6'>
                <div className='space-y-1.5'>
                  <div className='font-medium text-lg md:whitespace-pre-line'>
                    Toda visão que o seu time precisa
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Board, planilha, lista, Gantt. Troque na hora — cada papel
                    vê só o que importa pra ele.
                  </p>
                </div>
                <Image
                  src='/home/bg-home.png'
                  alt='Visão geral das integrações do Nexo'
                  width={5024}
                  height={2752}
                  sizes='100vw'
                  className='w-full h-auto object-cover object-center rounded-t-4xl relative hidden overflow-hidden md:block mt-auto'
                />
              </div>
              <div className='h-full rounded-xl bg-cover bg-center p-6 pb-0 text-start bg-card flex flex-col gap-6'>
                <div className='space-y-1.5'>
                  <div className='font-medium text-lg md:whitespace-pre-line'>
                    Dashboards em tempo real, sem configurar nada
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Velocidade do ciclo, carga de trabalho, bloqueios e mudanças
                    de escopo, tudo populado automaticamente. Sem relatório
                    manual, sem apresentação de sexta-feira.
                  </p>
                </div>
                <Image
                  src='/home/bg-home.png'
                  alt='Visão geral das integrações do Nexo'
                  width={5024}
                  height={2752}
                  sizes='100vw'
                  className='w-full h-auto object-cover object-center rounded-t-4xl relative hidden overflow-hidden md:block mt-auto'
                />
              </div>
            </div>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
              <div className='space-y-12 rounded-xl border border-border bg-card p-5'>
                <div className='bg-accent flex items-center justify-center rounded-lg border-px border-border size-10'>
                  <NexoIcon icon={ArrowRight02Icon} size={20} strokeWidth={2} />
                </div>
                <div className='space-y-1.5 text-start'>
                  <div className='font-medium text-base md:whitespace-pre-line'>
                    Ciclos e sprints
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Trabalho com prazo definido, com gráfico de burndown e
                    velocidade acompanhados automaticamente.
                  </p>
                </div>
              </div>
              <div className='space-y-12 rounded-xl border border-border bg-card p-5'>
                <div className='bg-accent flex items-center justify-center rounded-lg border-px border-border size-10'>
                  <NexoIcon icon={ArrowRight02Icon} size={20} strokeWidth={2} />
                </div>
                <div className='space-y-1.5 text-start'>
                  <div className='font-medium text-base md:whitespace-pre-line'>
                    Documentação embutida
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Docs completos, no mesmo lugar que os projetos que eles
                    documentam.
                  </p>
                </div>
              </div>
              <div className='space-y-12 rounded-xl border border-border bg-card p-5'>
                <div className='bg-accent flex items-center justify-center rounded-lg border-px border-border size-10'>
                  <NexoIcon icon={ArrowRight02Icon} size={20} strokeWidth={2} />
                </div>
                <div className='space-y-1.5 text-start'>
                  <div className='font-medium text-base md:whitespace-pre-line'>
                    Épicos e iniciativas
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Conecte o trabalho do time às metas da empresa, com
                    progresso consolidado automaticamente.
                  </p>
                </div>
              </div>
              <div className='space-y-12 rounded-xl border border-border bg-card p-5'>
                <div className='bg-accent flex items-center justify-center rounded-lg border-px border-border size-10'>
                  <NexoIcon icon={ArrowRight02Icon} size={20} strokeWidth={2} />
                </div>
                <div className='space-y-1.5 text-start'>
                  <div className='font-medium text-base md:whitespace-pre-line'>
                    Workflows e aprovações
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Automatize handoffs, revisões e etapas de aprovação sem
                    precisar de plugin.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className='flex flex-col items-center text-center bg-surface-highlight'>
          <div className='w-full mx-auto py-20 gap-12 xl:max-w-336 xl:px-11 2xl:max-w-384 space-y-11'>
            <div className='flex flex-col items-start gap-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-2 space-y-3 items-start'>
                <h2 className='md:whitespace-pre-line font-mono font-normal text-4xl leading-[1.3] tracking-[-.03em] text-start'>
                  Auto-hospede o Nexo, <br />
                  no local ou em ambiente isolado
                </h2>
                <p className='text-muted-foreground md:whitespace-pre-line text-lg text-start'>
                  A única plataforma moderna de gestão de projetos feita para
                  ambientes onde você controla cada camada. <br />
                  Você mesmo instala e gerencia tudo — a licença é combinada
                  direto com o nosso time de vendas.
                </p>
              </div>
              <div className='flex gap-4 items-center flex-wrap justify-start'>
                <Link href='/talk-to-sales'>
                  <Button size='lg'>Auto-hospede o Nexo</Button>
                </Link>
                <Link href='/talk-to-sales'>
                  <Button variant='outline' size='lg'>
                    Falar com um humano{' '}
                    <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
                  </Button>
                </Link>
              </div>
            </div>
            <div>
              <Image
                src='/home/bg-home.png'
                alt='Visão geral das integrações do Nexo'
                width={5024}
                height={2752}
                sizes='100vw'
                className='w-full h-auto object-cover object-center rounded-t-4xl relative hidden overflow-hidden md:block mt-auto'
              />
            </div>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
              <div className='space-y-1.5 text-start'>
                <div className='font-medium text-base md:whitespace-pre-line'>
                  Prime CLI
                </div>
                <p className='text-sm text-muted-foreground'>
                  Instale, configure, atualize, faça backup e monitore sua
                  instância com comandos únicos. Suporte a múltiplas instâncias,
                  domínio próprio e escalonamento de serviços já incluídos.
                </p>
              </div>
              <div className='space-y-1.5 text-start'>
                <div className='font-medium text-base md:whitespace-pre-line'>
                  Docker e Kubernetes
                </div>
                <p className='text-sm text-muted-foreground'>
                  Implante com Docker para uma configuração rápida ou Kubernetes
                  com Helm charts para escala de produção. Use seu próprio
                  Postgres, Redis e armazenamento compatível com S3.
                </p>
              </div>
              <div className='space-y-1.5 text-start'>
                <div className='font-medium text-base md:whitespace-pre-line'>
                  God Mode
                </div>
                <p className='text-sm text-muted-foreground'>
                  Um painel de administração pra toda a sua instância. Configure
                  SMTP, métodos de autenticação, SSO, segurança do workspace e
                  preferências de telemetria em uma única tela.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className='flex flex-col items-center text-center bg-surface-highlight'>
          <div className='w-full mx-auto py-20 xl:max-w-336 xl:px-11 2xl:max-w-384'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6 text-start'>
                <div className='space-y-3'>
                  <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
                    Mobile
                  </div>
                  <h2 className='md:whitespace-pre-line font-mono font-normal text-4xl leading-[1.3] tracking-[-.03em]'>
                    Seu workspace inteiro na palma da mão, na nuvem ou
                    self-hosted
                  </h2>
                </div>
                <div className='flex gap-4 items-center flex-wrap justify-start'>
                  <Link href='#'>
                    <Button size='lg'>Baixar para Android</Button>
                  </Link>
                  <Link href='#'>
                    <Button size='lg'>Baixar para iOS</Button>
                  </Link>
                </div>
              </div>
              <Image
                src='/home/bg-home.png'
                alt='Visão geral do Nexo no mobile'
                width={5024}
                height={2752}
                sizes='100vw'
                className='w-full h-auto object-cover object-center rounded-4xl'
              />
            </div>
          </div>
        </section>
        <section className='flex flex-col items-center text-center mx-auto w-full py-20 gap-12 xl:max-w-336 xl:px-11 2xl:max-w-384'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-2 space-y-3 items-start'>
            <h2 className='md:whitespace-pre-line font-mono font-normal text-4xl leading-[1.3] tracking-[-.03em] text-start'>
              Segurança, conformidade e controle de nível enterprise
            </h2>
            <p className='text-muted-foreground md:whitespace-pre-line text-lg text-start'>
              O Nexo segue os padrões de segurança e conformidade que o time de
              InfoSec da sua empresa exige, na nuvem ou self-hosted.
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='space-y-5'>
              <div className='border-border p-10 flex items-center justify-center rounded-xl bg-card aspect-square'>
                <Image
                  src='/home/bg-home.png'
                  alt='Visão geral do Nexo no mobile'
                  width={5024}
                  height={2752}
                  sizes='100vw'
                  className='w-full h-auto object-cover object-center rounded-4xl'
                />
              </div>
              <div className='space-y-1.5 text-start'>
                <div className='font-medium text-base md:whitespace-pre-line'>
                  Segurança pensada nos princípios de SOC 2 e ISO 27001
                </div>
                <p className='text-sm text-muted-foreground'>
                  RBAC, hashing argon2, 2FA e auditoria em cada ação — com
                  privacy-by-design alinhado à LGPD e ao GDPR desde o primeiro
                  commit.
                </p>
                <Link href='/legals/security'>
                  <Button variant='link' size='lg' className='p-0 m-0'>
                    Saiba mais sobre segurança{' '}
                    <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className='space-y-5'>
              <div className='border-border p-10 flex items-center justify-center rounded-xl bg-card aspect-square'>
                <Image
                  src='/home/bg-home.png'
                  alt='Visão geral do Nexo no mobile'
                  width={5024}
                  height={2752}
                  sizes='100vw'
                  className='w-full h-auto object-cover object-center rounded-4xl'
                />
              </div>
              <div className='space-y-1.5 text-start'>
                <div className='font-medium text-base md:whitespace-pre-line'>
                  SLA de uptime com compromisso total
                </div>
                <p className='text-sm text-muted-foreground'>
                  Backups automáticos, escalonamento em tempo real e failover em
                  múltiplas camadas. Construído pra continuar no ar quando mais
                  importa.
                </p>
                <Link href='/status'>
                  <Button variant='link' size='lg' className='p-0 m-0'>
                    Acesse nossa página de status{' '}
                    <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className='space-y-5'>
              <div className='border-border p-10 flex items-center justify-center rounded-xl bg-card aspect-square'>
                <Image
                  src='/home/bg-home.png'
                  alt='Visão geral do Nexo no mobile'
                  width={5024}
                  height={2752}
                  sizes='100vw'
                  className='w-full h-auto object-cover object-center rounded-4xl'
                />
              </div>
              <div className='space-y-1.5 text-start'>
                <div className='font-medium text-base md:whitespace-pre-line'>
                  Identidade e acesso em cada camada
                </div>
                <p className='text-sm text-muted-foreground'>
                  SSO, SAML e LDAP em todo workspace. Autentique do seu jeito.
                </p>
                <Link href='/talk-to-sales'>
                  <Button variant='link' size='lg' className='p-0 m-0'>
                    Falar com vendas{' '}
                    <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className='flex flex-col items-center text-center w-full bg-surface-highlight'>
          <div className='w-full mx-auto py-20 gap-12 xl:max-w-336 xl:px-11 2xl:max-w-384 space-y-11'>
            <div className='space-y-3'>
              <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
                feito para devs e times de operação
              </div>
              <h2 className='md:whitespace-pre-line font-mono font-normal text-4xl leading-[1.3] tracking-[-.03em]'>
                Cada configuração versionada, revisada <br />e publicada direto
                do seu terminal.
              </h2>
            </div>
            <div className='flex gap-4 items-center flex-wrap justify-center'>
              <Link href='/sign-up'>
                <Button size='lg'>Comece grátis</Button>
              </Link>
              <Link href='/talk-to-sales'>
                <Button variant='outline' size='lg'>
                  Falar com um humano
                </Button>
              </Link>
            </div>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <div className='space-y-1.5 md:col-span-2 bg-card rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 items-center'>
                <div className='relative hidden h-full md:block'>
                  <Image
                    src='/home/project-as-code.jpg'
                    alt='Visão geral do Nexo no mobile'
                    width={5024}
                    height={2752}
                    sizes='100vw'
                    className='w-full h-full object-cover object-center'
                  />
                  <div className='absolute inset-0 bg-linear-to-l from-card to-transparent' />
                </div>
                <div className='p-6 flex flex-col gap-6 items-start'>
                  <div className='space-y-1.5 text-start'>
                    <h4 className='md:whitespace-pre-line font-medium text-3xl leading-[1.3] tracking-[-.03em]'>
                      Nexo Compose pra Projects-as-Code
                    </h4>
                    <p className='text-base text-muted-foreground'>
                      Defina projetos em YAML, versione no Git, publique direto
                      do terminal. <br />
                      Comece a tratar a configuração dos seus projetos como a
                      infraestrutura que ela é.
                    </p>
                  </div>
                  <Link href='/nexo-compose'>
                    <Button variant='link' size='lg' className='p-0 m-0'>
                      Leia mais
                    </Button>
                  </Link>
                </div>
              </div>
              <div className='relative space-y-1.5 rounded-lg p-6 hover:scale-101 transition-all duration-300 bg-card text-start'>
                <img
                  src='/home/api.svg'
                  alt=''
                  aria-hidden
                  className='absolute top-0 right-0 size-[110px]'
                />
                <h4 className='md:whitespace-pre-line font-medium text-xl leading-[1.3] tracking-[-.03em]'>
                  APIs, Webhooks e SDKs
                </h4>
                <p className='text-sm text-muted-foreground'>
                  API REST com OAuth 2.0, webhooks assinados via <br />
                  HMAC e SDKs tipados em Node.js e Python. Construa <br />
                  integrações, dashboards e automações sob medida.
                </p>
              </div>
              <div className='relative space-y-1.5 rounded-lg p-6 hover:scale-101 transition-all duration-300 bg-card text-start'>
                <img
                  src='/home/ai.svg'
                  alt=''
                  aria-hidden
                  className='absolute top-0 right-0 size-[110px]'
                />
                <h4 className='md:whitespace-pre-line font-medium text-xl leading-[1.3] tracking-[-.03em]'>
                  MCP Server
                </h4>
                <p className='text-sm text-muted-foreground'>
                  Servidor MCP nativo, um framework de agentes com <br />
                  suporte a @menções e rastreamento completo do ciclo <br />
                  de vida de cada execução. Deixe a IA gerenciar o trabalho
                  dentro do Nexo, não só lê-lo.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <WebFooter />
    </div>
  )
}
