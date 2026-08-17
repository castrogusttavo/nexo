import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function HeaderBreadcrumbCrumb({
  children,
  title,
  after,
}: {
  children?: React.ReactNode
  title?: string
  after?: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <li className='gap-1.5 inline-flex items-center font-semibold text-xs'>
            {children} {title} {after}
          </li>
        }
      />
      {title && (
        <TooltipContent
          side={'bottom'}
          className='cursor-pointer! hover:cursor-pointer!'
        >
          {title}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
