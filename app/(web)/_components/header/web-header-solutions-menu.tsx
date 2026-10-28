import {
  AsanaIcon,
  ClickUpIcon,
  JiraIcon,
  LinearIcon,
} from '@/components/icon/brand-icons'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { NavigationMenuContent } from '@/components/ui/navigation-menu'
import { WebHeaderMenuBadge } from './web-header-menu-badge'
import { WebHeaderMenuColumn } from './web-header-menu-column'
import { industries, scale, useCases } from './web-header-nav-data'

export function WebHeaderSolutionsMenu() {
  return (
    <NavigationMenuContent className='w-screen py-8'>
      <div className='mx-auto w-full space-y-8 px-4 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384'>
        <div className='grid grid-cols-4 items-start gap-8'>
          <WebHeaderMenuColumn label='Casos de Uso' items={useCases} />
          <WebHeaderMenuColumn label='Setores' items={industries} />
          <WebHeaderMenuColumn label='Escala' items={scale} />
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
                  <WebHeaderMenuBadge href='#' icon={<LinearIcon size={16} />}>
                    Linear
                  </WebHeaderMenuBadge>
                  <WebHeaderMenuBadge href='#' icon={<JiraIcon size={16} />}>
                    Jira
                  </WebHeaderMenuBadge>
                  <WebHeaderMenuBadge href='#' icon={<AsanaIcon size={16} />}>
                    Asana
                  </WebHeaderMenuBadge>
                  <WebHeaderMenuBadge href='#' icon={<ClickUpIcon size={16} />}>
                    ClickUp
                  </WebHeaderMenuBadge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </NavigationMenuContent>
  )
}
