import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { WebHeaderProductMenu } from './web-header-product-menu'
import { WebHeaderResourcesMenu } from './web-header-resources-menu'
import { WebHeaderSolutionsMenu } from './web-header-solutions-menu'

export function WebHeader() {
  return (
    <header className='mx-auto grid w-full grid-cols-[1fr_auto_1fr] items-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 sticky top-0 bg-background'>
      <Link href='/' className='justify-self-start'>
        <Image src='/brand/logo.svg' alt='nexo-logo' width={100} height={45} />
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
