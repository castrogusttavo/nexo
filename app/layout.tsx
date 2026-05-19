import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Suspense } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { CookieConsentBanner } from './_components/cookie-consent/banner'
import { ConsentedTrackers } from './_components/cookie-consent/consented-trackers'
import { CookieConsentInit } from './_components/cookie-consent/init'
import { Providers } from './_components/providers'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'AI-native project management | Nexo',
  description:
    'Nexo brings projects, docs, and AI-powered workflows into one unified workspace so teams and agents can plan, execute, and stay aligned.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' className={cn('dark', geist.variable)}>
      <body className='root antialiased bg-background text-primary h-screen'>
        <Suspense>
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
        </Suspense>
      </body>
    </html>
  )
}
