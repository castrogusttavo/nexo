import { Activity02Icon } from '@hugeicons-pro/core-stroke-rounded'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { Skeleton } from '@/components/ui/skeleton'

// The overview needs the project to render, so this stands in for it: the
// header is the same for everyone and shows at once, the body waits.
export function ProjectOverviewSkeleton() {
  return (
    <div className='w-full h-full overflow-hidden'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title='Visão geral'>
            <NexoIcon
              icon={Activity02Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <div aria-hidden className='w-full flex items-start h-full'>
        <div className='flex-1 p-6 space-y-4'>
          <Skeleton className='h-8 w-1/3' />
          <Skeleton className='h-64 w-full' />
        </div>
        <div className='min-w-90 xl:min-w-96 p-6 space-y-3 border-l border-secondary h-full'>
          <Skeleton className='h-6 w-1/2' />
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className='h-8 w-full' />
          ))}
        </div>
      </div>
    </div>
  )
}
