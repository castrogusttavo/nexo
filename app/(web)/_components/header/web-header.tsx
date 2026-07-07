import type { IconSvgElement } from '@hugeicons/react'
import {
  ArrowRight02Icon,
  Github01Icon,
  GitlabIcon,
  ServerStack03Icon,
  SlackIcon,
} from '@hugeicons-pro/core-solid-rounded'
import { ArrowUpRightIcon } from '@hugeicons-pro/core-stroke-rounded'
import {
  SiAsana,
  SiClickup,
  SiJira,
  SiLinear,
} from '@icons-pack/react-simple-icons'
import Image from 'next/image'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import {
  discover,
  featureCapabilities,
  industries,
  learn,
  products,
  scale,
  useCases,
} from './web-header-nav-data'

export function WebHeader() {
  return (
    <header className='mx-auto grid w-full grid-cols-[1fr_auto_1fr] items-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384'>
      <Link href='/' className='justify-self-start'>
        <Image src='/brand/logo.svg' alt='nexo-logo' width={100} height={45} />
      </Link>
      <NavigationMenu className='flex-1'>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Produto</NavigationMenuTrigger>
            <NavigationMenuContent className='w-screen py-8'>
              <div className='mx-auto w-full space-y-8 px-4 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384'>
                <div className='grid grid-cols-4 items-start gap-8'>
                  <div className='flex flex-col gap-1.5'>
                    <Muted className='px-2'>Produtos</Muted>
                    <ul className='grid grid-cols-1 gap-4'>
                      {products.map((product) => (
                        <ListItem
                          key={product.title}
                          title={product.title}
                          href={product.href}
                          icon={product.icon}
                        >
                          <span className='text-sm'>{product.description}</span>
                        </ListItem>
                      ))}
                    </ul>
                  </div>
                  <div className='col-span-2 flex flex-col gap-1.5'>
                    <Muted className='px-2'>Capacidades de Recursos</Muted>
                    <ul className='grid grid-cols-2 gap-4'>
                      {featureCapabilities.map((feature) => (
                        <ListItem
                          key={feature.title}
                          title={feature.title}
                          href={feature.href}
                          icon={feature.icon}
                        >
                          <span className='text-sm'>{feature.description}</span>
                        </ListItem>
                      ))}
                    </ul>
                  </div>
                  <div className='flex flex-col gap-4'>
                    <Card className='bg-muted border border-brand-500'>
                      <CardContent className='space-y-1.5'>
                        <NexoIcon icon={ServerStack03Icon} size={20} />
                        <CardTitle>Auto-hospede o Nexo</CardTitle>
                        <CardDescription>
                          Tudo o que existe na nuvem, implantado na sua própria
                          infraestrutura.
                        </CardDescription>
                      </CardContent>
                    </Card>
                    <Card className='bg-branding-950 border border-brand-500'>
                      <CardContent className='space-y-2.5'>
                        <CardTitle>Funciona com sua stack</CardTitle>
                        <CardDescription>
                          <div className='flex gap-2'>
                            <Badge
                              className='py-3'
                              render={
                                <Link href='#'>
                                  <NexoIcon icon={SlackIcon} />
                                  Slack
                                  <NexoIcon icon={ArrowUpRightIcon} />
                                </Link>
                              }
                            />
                            <Badge
                              className='py-3'
                              render={
                                <Link href='#'>
                                  <NexoIcon icon={Github01Icon} />
                                  GitHub
                                  <NexoIcon icon={ArrowUpRightIcon} />
                                </Link>
                              }
                            />
                            <Badge
                              className='py-3'
                              render={
                                <Link href='#'>
                                  <NexoIcon icon={GitlabIcon} />
                                  GitLab
                                  <NexoIcon icon={ArrowUpRightIcon} />
                                </Link>
                              }
                            />
                          </div>
                          <Link href='/marketplace'>
                            <Button variant='link' size='sm' className='p-0'>
                              Navegar pelo marketplace
                              <NexoIcon icon={ArrowRight02Icon} size={20} />
                            </Button>
                          </Link>
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                <div className='flex items-center justify-between bg-muted/75 rounded-md p-2.5'>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm'>
                      Novidade: Suporte ao GovSlack, correção do endpoint de
                      notificações, otimizações de monitoramento | Versão v2.6.3
                    </p>
                    <Button variant='link' size='sm'>
                      Saiba mais <NexoIcon icon={ArrowRight02Icon} size={20} />
                    </Button>
                  </div>
                  <Button variant='link' size='sm'>
                    Baixe o app do Nexo
                  </Button>
                </div>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Soluções</NavigationMenuTrigger>
            <NavigationMenuContent className='w-screen py-8'>
              <div className='mx-auto w-full space-y-8 px-4 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384'>
                <div className='grid grid-cols-4 items-start gap-8'>
                  <div className='flex flex-col gap-1.5'>
                    <Muted className='px-2'>Casos de Uso</Muted>
                    <ul className='grid grid-cols-1 gap-4'>
                      {useCases.map((useCase) => (
                        <ListItem
                          key={useCase.title}
                          title={useCase.title}
                          href={useCase.href}
                          icon={useCase.icon}
                        >
                          <span className='text-sm'>{useCase.description}</span>
                        </ListItem>
                      ))}
                    </ul>
                  </div>
                  <div className='flex flex-col gap-1.5'>
                    <Muted className='px-2'>Setores</Muted>
                    <ul className='grid grid-cols-1 gap-4'>
                      {industries.map((industry) => (
                        <ListItem
                          key={industry.title}
                          title={industry.title}
                          href={industry.href}
                          icon={industry.icon}
                        >
                          <span className='text-sm'>
                            {industry.description}
                          </span>
                        </ListItem>
                      ))}
                    </ul>
                  </div>
                  <div className='flex flex-col gap-1.5'>
                    <Muted className='px-2'>Escala</Muted>
                    <ul className='grid grid-cols-1 gap-4'>
                      {scale.map((size) => (
                        <ListItem
                          key={size.title}
                          title={size.title}
                          href={size.href}
                          icon={size.icon}
                        >
                          <span className='text-sm'>{size.description}</span>
                        </ListItem>
                      ))}
                    </ul>
                  </div>
                  <div className='flex flex-col gap-4 h-full'>
                    <Card className='bg-muted border border-brand-500 h-full'>
                      <CardContent className='flex flex-1 flex-col'>
                        <CardTitle>
                          Descubra por que as equipes migram para o Nexo
                        </CardTitle>
                        <CardDescription className='mt-1.5'>
                          Veja como o Nexo se compara às ferramentas que você já
                          conhece
                        </CardDescription>
                        <div className='mt-auto flex flex-wrap gap-2 pt-4'>
                          <Badge
                            className='py-3'
                            render={
                              <Link href='#'>
                                <SiLinear size={16} />
                                Linear
                                <NexoIcon icon={ArrowUpRightIcon} />
                              </Link>
                            }
                          />
                          <Badge
                            className='py-3'
                            render={
                              <Link href='#'>
                                <SiJira size={16} />
                                Jira
                                <NexoIcon icon={ArrowUpRightIcon} />
                              </Link>
                            }
                          />
                          <Badge
                            className='py-3'
                            render={
                              <Link href='#'>
                                <SiAsana size={16} />
                                Asana
                                <NexoIcon icon={ArrowUpRightIcon} />
                              </Link>
                            }
                          />
                          <Badge
                            className='py-3'
                            render={
                              <Link href='#'>
                                <SiClickup size={16} />
                                ClickUp
                                <NexoIcon icon={ArrowUpRightIcon} />
                              </Link>
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Recursos</NavigationMenuTrigger>
            <NavigationMenuContent className='w-screen py-8'>
              <div className='mx-auto w-full space-y-8 px-4 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384'>
                <div className='grid grid-cols-4 items-start gap-8'>
                  <div className='flex flex-col gap-1.5'>
                    <Muted className='px-2'>Descobrir</Muted>
                    <ul className='grid grid-cols-1 gap-4'>
                      {discover.map((item) => (
                        <ListItem
                          key={item.title}
                          title={item.title}
                          href={item.href}
                          icon={item.icon}
                        >
                          <span className='text-sm'>{item.description}</span>
                        </ListItem>
                      ))}
                    </ul>
                  </div>
                  <div className='flex flex-col gap-1.5'>
                    <Muted className='px-2'>Aprender</Muted>
                    <ul className='grid grid-cols-1 gap-4'>
                      {learn.map((item) => (
                        <ListItem
                          key={item.title}
                          title={item.title}
                          href={item.href}
                          icon={item.icon}
                        >
                          <span className='text-sm'>{item.description}</span>
                        </ListItem>
                      ))}
                    </ul>
                  </div>
                  <div className='col-span-2 flex gap-4 h-full'>
                    <div className='flex-1 flex flex-col gap-1.5'>
                      <Muted>Última atualização</Muted>
                      <Link href='#' className='h-full'>
                        <Card className='bg-muted border border-brand-500 h-full'>
                          <CardContent className='space-y-1.5 flex flex-col justify-between h-full'>
                            <Badge>Versão 2.6.3</Badge>
                            <div>
                              <CardTitle className='text-branding-400'>
                                Self-Hosted
                              </CardTitle>
                              <CardDescription className='line-clamp-2'>
                                Suporte ao GovSlack, correção do endpoint de
                                notificações e otimizações no monitoramento
                              </CardDescription>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                    <div className='flex-1 flex flex-col gap-1.5'>
                      <Muted>Download</Muted>
                      <Link href='#' className='h-full'>
                        <Card className='relative overflow-hidden bg-muted border border-brand-500 h-full'>
                          <div className='pointer-events-none absolute inset-0'>
                            <img
                              src='/static/app-mobile.avif'
                              alt='nexo-mobile'
                              className='h-full w-full object-center object-cover brightness-75'
                            />
                            <div className='absolute inset-0 bg-linear-to-t from-black to-transparent' />
                          </div>
                          <CardContent className='relative z-10 space-y-2.5 flex flex-col justify-between h-full'>
                            <Badge>Em breve</Badge>
                            <div>
                              <CardTitle className='flex gap-2'>
                                Nexo em todos os dispositivos
                              </CardTitle>
                              <CardDescription>
                                Disponível para Mac, Windows, iOS e Android
                              </CardDescription>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            render={<Link href='/pricing'>Assinatura</Link>}
          />
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            render={<Link href='/self-hosted'>Self-host Nexo</Link>}
          />
        </NavigationMenuList>
      </NavigationMenu>
      <div className='flex items-center gap-1.5 justify-self-end'>
        <Link href='/talk-to-sales'>
          <Button variant='ghost' size='sm'>
            Falar com vendas
          </Button>
        </Link>
        <Link href='/sign-in'>
          <Button variant='ghost' size='sm'>
            Entrar
          </Button>
        </Link>
        <Link href='/sign-up'>
          <Button variant='default' size='sm'>
            Comece grátis
          </Button>
        </Link>
      </div>
    </header>
  )
}

function ListItem({
  title,
  children,
  href,
  icon,
  ...props
}: React.ComponentPropsWithoutRef<'li'> & {
  href: string
  icon?: IconSvgElement
}) {
  return (
    <li className='h-full' {...props}>
      <NavigationMenuLink
        className='h-full items-start'
        render={
          <Link href={href}>
            <div className='flex w-full flex-col gap-1 text-sm hover:text-branding-700 hover:dark:text-branding-400'>
              <div className='flex items-center gap-1.5'>
                {icon && <NexoIcon icon={icon} size={20} />}
                <div className='leading-none font-medium'>{title}</div>
              </div>
              <div className='line-clamp-2 text-muted-foreground'>
                {children}
              </div>
            </div>
          </Link>
        }
      />
    </li>
  )
}
