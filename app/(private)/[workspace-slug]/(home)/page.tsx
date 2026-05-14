import { Shapes01Icon } from '@hugeicons-pro/core-solid-rounded'
import { Add01Icon, Home09Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { UserStick } from '@/app/_components/user/sticky/user-sticky'
import { ShortcutLink } from '@/app/_components/user/user-shortcut-link'
import { NexoIcon } from '@/components/icon/icon'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Small } from '@/components/typography/text/small'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Página inicial | Nexo',
  description: 'Seu painel inicial com links rápidos e anotações.',
}

const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

async function getGreeting() {
  'use cache'
  cacheLife('hours')
  cacheTag('greeting')

  const hour = new Date().getHours()

  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'

  return 'Boa noite'
}

async function getFullDate() {
  'use cache'
  cacheLife('hours')
  cacheTag('full-date')

  return fullDateFormatter
    .formatToParts(new Date())
    .map((part) =>
      part.type === 'weekday' || part.type === 'month'
        ? part.value.charAt(0).toUpperCase() + part.value.slice(1)
        : part.value,
    )
    .join('')
}

export default async function Page() {
  return (
    <div className='w-full h-full overflow-y-scroll'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Página inicial'}>
            <NexoIcon
              icon={Home09Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
        <Button variant='outline' size='xs'>
          <NexoIcon icon={Shapes01Icon} />
          Gerenciar widgets
        </Button>
      </HeaderInternalNavigation>
      <div className='max-w-[800px] w-full h-full mx-auto p-6 space-y-8'>
        <div>
          <div className='text-center'>
            <H4>{getGreeting()}, Gusttavo Castro</H4>
            <Muted>{getFullDate()}</Muted>
          </div>
        </div>

        <div className='flex flex-col flex-wrap w-full gap-y-3'>
          <div className='w-full flex items-center justify-between'>
            <Small>Links rápidos</Small>
            <Button size='xs' variant='link'>
              <NexoIcon icon={Add01Icon} strokeWidth={2} />
              Adicionar link rápido
            </Button>
          </div>
          <div className='flex gap-2 mb-2 flex-wrap flex-1'>
            <ShortcutLink
              href='https://google.com'
              title='Google'
              daysAgo='10'
            />
            <ShortcutLink
              href='https://google.com'
              title='Google'
              daysAgo='10'
            />
            <ShortcutLink
              href='https://google.com'
              title='Google'
              daysAgo='10'
            />
            <ShortcutLink
              href='https://google.com'
              title='Google'
              daysAgo='10'
            />
            <ShortcutLink
              href='https://google.com'
              title='Google'
              daysAgo='10'
            />
          </div>
        </div>

        <div className='flex flex-col flex-wrap w-full gap-y-3'>
          <div className='w-full flex items-center justify-between'>
            <Small>Suas anotações</Small>
            <Button size='xs' variant='link'>
              <NexoIcon icon={Add01Icon} strokeWidth={2} />
              Adicionar sticky
            </Button>
          </div>
          <div>
            <UserStick />
          </div>
        </div>
      </div>
    </div>
  )
}
