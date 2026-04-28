import {
  File02Icon,
  HelpCircleIcon,
  MessageMultiple01Icon,
  UserIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserDropdownHelper() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className='data-popup-open:bg-muted dark:data-popup-open:bg-muted p-1 rounded-md'
          >
            <NexoIcon icon={HelpCircleIcon} strokeWidth={2} size={20} />
          </Button>
        }
      />
      <DropdownMenuContent className='w-55 p-3 flex flex-col gap-y-2 rounded-md'>
        <DropdownMenuGroup>
          <Link href='/docs'>
            <DropdownMenuItem className='text-xs'>
              <NexoIcon icon={File02Icon} strokeWidth={2} size={20} />
              Documentação
            </DropdownMenuItem>
          </Link>
          <Link href='https://google.com' target='_blank'>
            <DropdownMenuItem className='text-xs'>
              <NexoIcon
                icon={MessageMultiple01Icon}
                strokeWidth={2}
                size={20}
              />
              Suporte por mensagens
            </DropdownMenuItem>
          </Link>
          <Link href='mailto:sales@nexo.coodee.dev' target='_blank'>
            <DropdownMenuItem className='text-xs'>
              <NexoIcon icon={UserIcon} strokeWidth={2} size={20} />
              Contatar vendas
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className='text-xs'>
            Atalhos do teclado
          </DropdownMenuItem>
          <DropdownMenuItem className='text-xs'>
            O que há de novo?
          </DropdownMenuItem>
          <Link href='/status'>
            <DropdownMenuItem className='text-xs'>
              Status do sistema
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className='text-xs' disabled>
            Version: latest
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
