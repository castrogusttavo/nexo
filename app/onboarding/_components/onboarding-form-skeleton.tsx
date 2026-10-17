import { Skeleton } from '@/components/ui/skeleton'

// Stands in for a step's form while the step checks who is asking and where
// they are in onboarding. The title above it is static and shows at once.
export function OnboardingFormSkeleton() {
  return (
    <div
      role='status'
      aria-label='Carregando'
      className='flex w-full flex-col gap-4'
    >
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-10 w-2/3' />
      <Skeleton className='mt-2 h-9 w-full' />
    </div>
  )
}
