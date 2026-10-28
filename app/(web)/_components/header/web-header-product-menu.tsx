import {
  ArrowRight02Icon,
  Github01Icon,
  GitlabIcon,
  SlackIcon,
} from '@hugeicons-pro/core-solid-rounded'
import { ButtonLink } from '@/components/button-link'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { NavigationMenuContent } from '@/components/ui/navigation-menu'
import { WebHeaderMenuBadge } from './web-header-menu-badge'
import { WebHeaderMenuColumn } from './web-header-menu-column'
import { featureCapabilities, products } from './web-header-nav-data'

export function WebHeaderProductMenu() {
  return (
    <NavigationMenuContent className='w-screen py-8'>
      <div className='mx-auto w-full space-y-8 px-4 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384'>
        <div className='grid grid-cols-4 items-start gap-8'>
          <WebHeaderMenuColumn label='Produtos' items={products} />
          <WebHeaderMenuColumn
            label='Capacidades de Recursos'
            items={featureCapabilities}
            columns={2}
            className='col-span-2'
          />
          <div className='flex flex-col gap-4'>
            <Card className='bg-branding-950 border border-brand-500'>
              <CardContent className='space-y-2.5'>
                <CardTitle>Funciona com sua stack</CardTitle>
                <CardDescription>
                  <div className='flex gap-2'>
                    <WebHeaderMenuBadge
                      href='#'
                      icon={<NexoIcon icon={SlackIcon} />}
                    >
                      Slack
                    </WebHeaderMenuBadge>
                    <WebHeaderMenuBadge
                      href='#'
                      icon={<NexoIcon icon={Github01Icon} />}
                    >
                      GitHub
                    </WebHeaderMenuBadge>
                    <WebHeaderMenuBadge
                      href='#'
                      icon={<NexoIcon icon={GitlabIcon} />}
                    >
                      GitLab
                    </WebHeaderMenuBadge>
                  </div>
                  <ButtonLink
                    href='/marketplace'
                    variant='link'
                    size='sm'
                    className='p-0'
                  >
                    Navegar pelo marketplace
                    <NexoIcon icon={ArrowRight02Icon} size={20} />
                  </ButtonLink>
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
