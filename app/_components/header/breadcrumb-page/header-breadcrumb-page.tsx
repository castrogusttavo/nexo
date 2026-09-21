import { Breadcrumb, BreadcrumbList } from '@/components/ui/breadcrumb'

/**
 * The page's breadcrumb on the left of the internal header row.
 *
 * The row gives its right-hand actions their natural width and hands the
 * breadcrumb whatever is left, so the breadcrumb has to be the part that
 * yields: `min-w-0` lets the nav shrink below its content, and `flex-nowrap`
 * keeps the crumbs on one line, where each title truncates with an ellipsis
 * (see HeaderBreadcrumbCrumb). Left to wrap, a 390px screen folded the pill
 * onto two lines of the 44px row while the actions overflowed it sideways.
 */
export function HeaderBreadcrumbList({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Breadcrumb className='min-w-0'>
      {/* Clipped, so a crumb squeezed below its icon never bleeds under the
          actions next to it. The 4px padding (cancelled by the negative
          margin) keeps a focused crumb's 3px ring inside the clip. */}
      <BreadcrumbList className='flex-nowrap overflow-hidden -m-1 p-1'>
        {children}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
