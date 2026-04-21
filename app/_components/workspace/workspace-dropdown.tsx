import {
  AddCircleIcon,
  AddTeamIcon,
  Logout05Icon,
  Settings01Icon,
  UserAdd01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCacheUser } from '@/src/hooks/cache/use-user'

interface WorkspaceDropdownProps {
  workspaceId: string | number
}

export function WorkSpaceDropdown() {
  const { data: user } = useCacheUser()
  const [workspace, setWorkspace] = useState('2')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost'>
            <div className='size-6 flex items-center justify-center rounded-sm bg-blue-400'>
              U
            </div>
            dsaojdaoisjdoaisj
          </Button>
        }
      />
      <DropdownMenuContent className='w-max p-3 flex flex-col gap-y-2 rounded-md'>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled className='text-sm'>
            {user?.user.email}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            className='text-sm space-y-1'
            value={workspace}
            onValueChange={setWorkspace}
          >
            <WorkspaceDropdownCard workspaceId='2' />
            <WorkspaceDropdownCard workspaceId='3' />
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem className='text-sm'>
            <NexoIcon icon={AddCircleIcon} />
            Criar workspace
          </DropdownMenuItem>
          <DropdownMenuItem className='text-sm'>
            <NexoIcon icon={AddTeamIcon} />
            Convidar para workspace
          </DropdownMenuItem>
          <DropdownMenuItem variant={'destructive'} className='text-sm'>
            <NexoIcon icon={Logout05Icon} />
            Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function WorkspaceDropdownCard({ workspaceId }: WorkspaceDropdownProps) {
  return (
    <DropdownMenuRadioItem
      value={workspaceId}
      className='data-checked:bg-accent'
    >
      <div className='flex flex-col items-start justify-center space-y-4'>
        <div className='w-full flex gap-1.5 items-center'>
          <div className='size-6 flex items-center justify-center rounded-sm bg-blue-400'>
            U
          </div>
          <div className='w-max'>
            <p>dsaojdaoisjdoaisj</p>
            <div className='text-xs text-muted-foreground flex gap-2 capitalize w-fit'>
              <span>Admin</span>
              <span>1 Membro</span>
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <Button size='xs' variant='outline'>
            <NexoIcon icon={Settings01Icon} />
            Configurações
          </Button>
          <Button size='xs' variant='outline'>
            <NexoIcon icon={UserAdd01Icon} />
            Convidar membros
          </Button>
        </div>
      </div>
    </DropdownMenuRadioItem>
  )
}
