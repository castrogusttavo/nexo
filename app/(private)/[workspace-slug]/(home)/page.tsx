import { Home09Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { cacheLife, cacheTag, io } from 'next/cache'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { UserShortcutLinkDialog } from '@/app/_components/user/shortcut-link/user-shortcut-link-dialog'
import { UserShortcutLinkList } from '@/app/_components/user/shortcut-link/user-shortcut-link-list'
import { UserStickyCreateButton } from '@/app/_components/user/sticky/user-sticky-create-button'
import { UserStickyList } from '@/app/_components/user/sticky/user-sticky-list'
import { NexoIcon } from '@/components/icon/icon'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Small } from '@/components/typography/text/small'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/src/lib/dal'
import { DEFAULT_HOME_WIDGETS } from '@/src/schemas/user-preference.schema'
import { UserPreferenceService } from '@/src/services/user-preference.service'
import { HomeWidgetList } from './home-widget-list'
import { HomeWidgetsDialog } from './home-widgets-dialog'

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

function HomeWidgetSection({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col flex-wrap w-full gap-y-3'>
      <div className='w-full flex items-center justify-between'>
        <Small>{title}</Small>
        {action}
      </div>
      {children}
    </div>
  )
}

// Read on the server so hidden widgets never paint and the order is right
// on the first frame; the client query takes over from there.
async function HomeWidgets({ userId }: { userId: string }) {
  // Below the DAL's private cache, a query that opens a pooled connection
  // draws random bytes (pg's SCRAM nonce), which a prerender refuses.
  await io()
  const preferences = await UserPreferenceService.get(userId)
  const initialWidgets = preferences.ok
    ? preferences.value.homeWidgets
    : DEFAULT_HOME_WIDGETS

  return (
    <HomeWidgetList
      initialWidgets={initialWidgets}
      widgets={{
        'quick-links': (
          <HomeWidgetSection
            title='Links rápidos'
            action={<UserShortcutLinkDialog />}
          >
            <UserShortcutLinkList />
          </HomeWidgetSection>
        ),
        // Filled in by the Recentes work; the toggle and the order already
        // apply to it.
        recents: (
          <HomeWidgetSection title='Recentes'>
            <Muted>O que você criar ou atualizar aparece aqui.</Muted>
          </HomeWidgetSection>
        ),
        stickies: (
          <HomeWidgetSection
            title='Suas anotações'
            action={<UserStickyCreateButton />}
          >
            <div>
              <UserStickyList />
            </div>
          </HomeWidgetSection>
        ),
      }}
    />
  )
}

export default async function Page() {
  // Awaited, not handed to JSX as promises. Both are `use cache`, so the cost
  // is a cache read; rendering the promise itself made the greeting a
  // suspending child with no boundary above it, which is the slowest possible
  // way to show a string the cache already had.
  const [user, greeting, fullDate] = await Promise.all([
    getCurrentUser(),
    getGreeting(),
    getFullDate(),
  ])
  const greeted = firstName(user.name)

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
        <HomeWidgetsDialog />
      </HeaderInternalNavigation>
      <div className='max-w-200 w-full h-full mx-auto p-6 space-y-8'>
        <div>
          <div className='text-center'>
            <H4>
              {greeting}
              {greeted && `, ${greeted}`}
            </H4>
            <Muted>{fullDate}</Muted>
          </div>
        </div>

        <Suspense
          fallback={
            <div className='space-y-8'>
              <Skeleton className='h-24 w-full' />
              <Skeleton className='h-40 w-full' />
            </div>
          }
        >
          <HomeWidgets userId={user.id} />
        </Suspense>
      </div>
    </div>
  )
}
