'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'
import { WebHeaderProductMenu } from './web-header-product-menu'
import { WebHeaderResourcesMenu } from './web-header-resources-menu'
import { WebHeaderSolutionsMenu } from './web-header-solutions-menu'

export function WebHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'mx-auto grid w-full grid-cols-[1fr_auto_1fr] items-center px-4 py-3 sm:px-8 xl:px-11 sticky top-0 bg-background z-50 border-2 border-t-0 border-border transition-[max-width,border-radius,border-color] duration-300 ease-out',
        scrolled
          ? 'xl:max-w-336 2xl:max-w-384 rounded-b-2xl'
          : 'max-w-full rounded-none border-x-transparent',
      )}
    >
      <Link href='/' className='justify-self-start'>
        <Image
          src='/brand/logo.svg'
          alt='nexo-logo'
          width={100}
          height={45}
          className='light:invert'
        />
      </Link>
      <NavigationMenu className='flex-1'>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Produto</NavigationMenuTrigger>
            <WebHeaderProductMenu />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Soluções</NavigationMenuTrigger>
            <WebHeaderSolutionsMenu />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Recursos</NavigationMenuTrigger>
            <WebHeaderResourcesMenu />
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
