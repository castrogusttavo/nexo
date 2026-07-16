import Link from 'next/link'
import { Muted } from '@/components/typography/text/muted'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { NavigationMenuContent } from '@/components/ui/navigation-menu'
import { ListItem } from './web-header-list-item'
import { discover, learn } from './web-header-nav-data'

export function WebHeaderResourcesMenu() {
  return (
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
  )
}
