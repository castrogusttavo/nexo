import {
  Alert02Icon,
  EnergyEllipseIcon,
  EnergyRectangleIcon,
} from '@hugeicons-pro/core-bulk-rounded'
import { ZapIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ProjectDisabledField } from '../project-disabled-field'

function UpdateField() {
  return (
    <div className='bg-accent'>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant='outline' size='sm'>
              valor
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuRadioGroup>
            <DropdownMenuRadioItem value='good-path'>
              <NexoIcon icon={EnergyEllipseIcon} className='text-green-500' />
              No caminho certo
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='good-path'>
              <NexoIcon
                icon={EnergyRectangleIcon}
                className='text-yellow-500'
              />
              Fora do caminho
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='good-path'>
              <NexoIcon icon={Alert02Icon} className='text-red-500' />
              Em risco
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Input
        placeholder='Adicione uma atualização'
        className='border-none bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0'
      />
      <div>
        <Button>Cancelar</Button>
        <Button>Adicionar atualização</Button>
      </div>
    </div>
  )
}

export function ProjectDetailsUpdates({
  projectStatesEnabled = true,
}: {
  projectStatesEnabled: boolean
}) {
  return (
    <div className='space-y-2'>
      {projectStatesEnabled ? (
        <UpdateField />
      ) : (
        <ProjectDisabledField
          icon={ZapIcon}
          title='Updates'
          description='Feature is disabled, you can enable it in settings'
        />
      )}
    </div>
  )
}
