import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";

export function LayoutOptions({ children }: { children: ReactNode }) {
  return (
    <ButtonGroup className="border-0!">
      {children}
    </ButtonGroup>
  )
}

interface OptionButtonProps {
  children: ReactNode
  content: ReactNode
  active?: boolean
  onClick?: () => void
}

export function OptionButton({ children, content, active = false, onClick }: OptionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <Button
          variant={active ? 'default' : 'secondary'}
          size='icon-sm'
          className='border-0! h-8'
          onClick={onClick}
        >
          {children}
        </Button>
      } />
      <TooltipContent >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
