import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function IssueLayoutOptions({ children }: { children: ReactNode }) {
  return <ButtonGroup className='border-0!'>{children}</ButtonGroup>
}

interface IssueLayoutOptionButtonProps {
  children: ReactNode
  content: ReactNode
  active?: boolean
  onClick?: () => void
}

export function IssueLayoutOptionButton({
  children,
  content,
  active = false,
  onClick,
}: IssueLayoutOptionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? 'default' : 'secondary'}
            size='icon-sm'
            className='border-0! h-8'
            onClick={onClick}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  )
}
