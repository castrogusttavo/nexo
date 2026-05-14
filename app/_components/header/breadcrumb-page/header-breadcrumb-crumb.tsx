import { BreadcrumbItem } from '@/components/ui/breadcrumb'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function HeaderBreadcrumbCrumb({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <BreadcrumbItem className='font-semibold text-xs'>
            {children} {title}
          </BreadcrumbItem>
        }
      />
      <TooltipContent
        side={'bottom'}
        className='cursor-pointer! hover:cursor-pointer!'
      >
        {title}
      </TooltipContent>
    </Tooltip>
  )
}
