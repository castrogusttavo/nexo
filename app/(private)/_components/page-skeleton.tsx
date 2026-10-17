import { Skeleton } from '@/components/ui/skeleton'

// Stands in for the part of a private page that waits on the workspace or the
// project, under a heading that already rendered.
export function PageSkeleton() {
  return (
    <div aria-hidden className='w-full p-6 space-y-4'>
      <Skeleton className='h-8 w-1/3' />
      <Skeleton className='h-64 w-full' />
    </div>
  )
}
