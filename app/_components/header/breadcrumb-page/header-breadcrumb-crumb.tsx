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
          // `min-w-0` + a truncating title: when the row is narrow the title
          // gives up its width as a one-line ellipsis (the tooltip still
          // shows it in full) instead of wrapping.
          <li className='gap-1.5 inline-flex min-w-0 items-center font-semibold text-xs'>
            {children}
            {title && <span className='truncate'>{title}</span>}
            {after}
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
