import { Shapes01Icon } from '@hugeicons-pro/core-solid-rounded'
import { Home09Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { UserShortcutLinkList } from '@/app/_components/user/shortcut-link/user-shortcut-link-list'
import { UserShortcutLinkModal } from '@/app/_components/user/shortcut-link/user-shortcut-link-modal'
import { UserStickyCreateButton } from '@/app/_components/user/sticky/user-sticky-create-button'
import { UserStickyList } from '@/app/_components/user/sticky/user-sticky-list'
import { NexoIcon } from '@/components/icon/icon'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Small } from '@/components/typography/text/small'
import { Button } from '@/components/ui/button'
import { getAuthSession } from '@/src/lib/auth-session'

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

/** First name only: the greeting is a salutation, not an identity check. */
function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? ''
}

export default async function Page() {
  const session = await getAuthSession()
  const greeted = session.ok ? firstName(session.value.user.name) : ''

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
        {/* Icon-only below `sm`: next to both sidebars a phone leaves the
            row ~130px, less than the label alone. The label stays as the
            accessible name. */}
        <Button variant='outline' size='xs'>
          <NexoIcon icon={Shapes01Icon} />
          <span className='max-sm:sr-only'>Gerenciar widgets</span>
        </Button>
      </HeaderInternalNavigation>
      <div className='max-w-200 w-full h-full mx-auto p-6 space-y-8'>
        <div>
          <div className='text-center'>
            <H4>
              {getGreeting()}
              {greeted && `, ${greeted}`}
            </H4>
            <Muted>{getFullDate()}</Muted>
          </div>
        </div>

        <div className='flex flex-col flex-wrap w-full gap-y-3'>
          <div className='w-full flex items-center justify-between'>
            <Small>Links rápidos</Small>
            <UserShortcutLinkModal />
          </div>
          <UserShortcutLinkList />
        </div>

        <div className='flex flex-col flex-wrap w-full gap-y-3'>
          <div className='w-full flex items-center justify-between'>
            <Small>Suas anotações</Small>
            <UserStickyCreateButton />
          </div>
          <div>
            <UserStickyList />
          </div>
        </div>
      </div>
    </div>
  )
}
