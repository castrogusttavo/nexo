import { ArrowUpRightIcon } from '@hugeicons-pro/core-stroke-rounded'
import {
  SiAsana,
  SiClickup,
  SiJira,
  SiLinear,
} from '@icons-pack/react-simple-icons'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
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
import { industries, scale, useCases } from './web-header-nav-data'

export function WebHeaderSolutionsMenu() {
  return (
    <NavigationMenuContent className='w-screen py-8'>
      <div className='mx-auto w-full space-y-8 px-4 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384'>
        <div className='grid grid-cols-4 items-start gap-8'>
          <div className='flex flex-col gap-1.5'>
            <Muted className='px-2'>Casos de Uso</Muted>
            <ul className='grid grid-cols-1 gap-4'>
              {useCases.map((useCase) => (
                <ListItem
                  key={useCase.title}
                  title={useCase.title}
                  href={useCase.href}
                  icon={useCase.icon}
                >
                  <span className='text-sm'>{useCase.description}</span>
                </ListItem>
              ))}
            </ul>
          </div>
          <div className='flex flex-col gap-1.5'>
            <Muted className='px-2'>Setores</Muted>
            <ul className='grid grid-cols-1 gap-4'>
              {industries.map((industry) => (
                <ListItem
                  key={industry.title}
                  title={industry.title}
                  href={industry.href}
                  icon={industry.icon}
                >
                  <span className='text-sm'>{industry.description}</span>
                </ListItem>
              ))}
            </ul>
          </div>
          <div className='flex flex-col gap-1.5'>
            <Muted className='px-2'>Escala</Muted>
            <ul className='grid grid-cols-1 gap-4'>
              {scale.map((size) => (
                <ListItem
                  key={size.title}
                  title={size.title}
                  href={size.href}
                  icon={size.icon}
                >
                  <span className='text-sm'>{size.description}</span>
                </ListItem>
              ))}
            </ul>
          </div>
          <div className='flex flex-col gap-4 h-full'>
            <Card className='bg-muted border border-brand-500 h-full'>
              <CardContent className='flex flex-1 flex-col'>
                <CardTitle>
                  Descubra por que as equipes migram para o Nexo
                </CardTitle>
                <CardDescription className='mt-1.5'>
                  Veja como o Nexo se compara às ferramentas que você já conhece
                </CardDescription>
                <div className='mt-auto flex flex-wrap gap-2 pt-4'>
                  <Badge
                    className='py-3'
                    render={
                      <Link href='#'>
                        <SiLinear size={16} />
                        Linear
                        <NexoIcon icon={ArrowUpRightIcon} />
                      </Link>
                    }
                  />
                  <Badge
                    className='py-3'
                    render={
                      <Link href='#'>
                        <SiJira size={16} />
                        Jira
                        <NexoIcon icon={ArrowUpRightIcon} />
                      </Link>
                    }
                  />
                  <Badge
                    className='py-3'
                    render={
                      <Link href='#'>
                        <SiAsana size={16} />
                        Asana
                        <NexoIcon icon={ArrowUpRightIcon} />
                      </Link>
                    }
                  />
                  <Badge
                    className='py-3'
                    render={
                      <Link href='#'>
                        <SiClickup size={16} />
                        ClickUp
                        <NexoIcon icon={ArrowUpRightIcon} />
                      </Link>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </NavigationMenuContent>
  )
}
