import {
  ArrowRight02Icon,
  Github01Icon,
  GitlabIcon,
  ServerStack03Icon,
  SlackIcon,
} from '@hugeicons-pro/core-solid-rounded'
import { ArrowUpRightIcon } from '@hugeicons-pro/core-stroke-rounded'
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
import { NavigationMenuContent } from '@/components/ui/navigation-menu'
import { ListItem } from './web-header-list-item'
import { featureCapabilities, products } from './web-header-nav-data'

export function WebHeaderProductMenu() {
  return (
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
  )
}
