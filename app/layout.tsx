import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import './globals.css'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Suspense } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Providers } from './_components/providers'
import { CookieConsentBanner } from './_components/user/cookie-consent/banner'
import { ConsentedTrackers } from './_components/user/cookie-consent/consented-trackers'
import { CookieConsentInit } from './_components/user/cookie-consent/init'

export const metadata: Metadata = {
  title: 'AI-native project management | Nexo',
  description:
    'Nexo brings projects, docs, and AI-powered workflows into one unified workspace so teams and agents can plan, execute, and stay aligned.',
}

const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )nexo\\.theme=([^;]+)/);var t=m?decodeURIComponent(m[1]):'SYSTEM';var dark=t==='DARK'||(t==='SYSTEM'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark)}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang='en'
      className={cn(
        'scroll-smooth dark',
        GeistSans.variable,
        GeistMono.variable,
      )}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className='root antialiased bg-background text-primary h-screen'>
        <Suspense>
          <NuqsAdapter>
            <Providers>
              <CookieConsentInit>
                <TooltipProvider>
                  {children}
                  <Toaster />
                </TooltipProvider>
                <ConsentedTrackers />
                <CookieConsentBanner />
              </CookieConsentInit>
            </Providers>
          </NuqsAdapter>
        </Suspense>
      </body>
    </html>
  )
}
