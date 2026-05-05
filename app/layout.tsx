import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Home03Icon, PanelLeftIcon, SlidersHorizontalIcon } from '@hugeicons-pro/core-stroke-rounded'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Suspense } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WebVitals } from '@/lib/axiom/client'
import { cn } from '@/lib/utils'
import { UserHeader } from './_components/header/user-header'
import { ContextHeader, ContextPrimaryAction, ContextSidebar, NavGroup, NavItem } from './_components/navigation/context-sidebar-navigation'
import { GlobalSidebarNavigation } from './_components/navigation/global-sidebar-navigation'
import { Providers } from './_components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Home Page',
  description: 'AI-native project management | Nexo',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' className={cn('dark', inter.variable)}>
      <body className='root antialiased bg-background text-primary h-screen'>
        <Suspense>
          <Providers>
            <TooltipProvider>
              <div className='flex flex-col h-screen overflow-hidden'>
                <UserHeader />
                <div className='flex gap-x-1.5 flex-1 overflow-hidden min-h-0'>
                  <GlobalSidebarNavigation />
                  <div className='flex-1 w-full flex items-start bg-primary-foreground rounded-lg border border-border overflow-hidden'>
                    <ContextSidebar>
                      <ContextHeader
                        title='Projetos'
                        actions={
                          <>
                            <Button variant='ghost' size='icon-sm'>
                              <NexoIcon icon={SlidersHorizontalIcon} strokeWidth={2} />
                            </Button>
                            <Button variant='ghost' size='icon-sm'>
                              <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
                            </Button>
                          </>
                        }
                        primaryAction={
                          <ContextPrimaryAction>
                            <NexoIcon icon={SlidersHorizontalIcon} />
                            Nova issue
                          </ContextPrimaryAction>
                        }
                      />
                      <NavGroup>
                        <NavItem href='/' icon={Home03Icon}>
                          Página inicial
                        </NavItem>
                        <NavItem href='/drafts' icon={Home03Icon}>
                          Rascunhos
                        </NavItem>
                        <NavItem href='/profile' icon={Home03Icon}>
                          Seu trabalho
                        </NavItem>
                        <NavItem href='/stickies' icon={Home03Icon}>
                          Notas adesivas
                        </NavItem>
                      </NavGroup>
                      <NavGroup>
                        <NavItem href='/projects' icon={Home03Icon}>
                          Projetos
                        </NavItem>
                        <NavItem href='/active-cycles' icon={Home03Icon}>
                          Ciclos
                        </NavItem>
                        <NavItem href='/workspace-views' icon={Home03Icon}>
                          Visualizações
                        </NavItem>
                        <NavItem href='/analytics' icon={Home03Icon}>
                          Análises
                        </NavItem>
                        <NavItem href='/dashboards' icon={Home03Icon}>
                          Dashboards
                        </NavItem>
                      </NavGroup>
                    </ContextSidebar>
                    {children}
                  </div>
                </div>
              </div>
              <Toaster />
            </TooltipProvider>
          </Providers>
        </Suspense>
        <WebVitals />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
