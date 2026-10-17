import { NexoMarkLoader } from '@/components/brand/nexo-mark-loader'

// The fallback for any segment that has to wait before its own boundaries
// can show: a navigation that was not prefetched, or a slow first render.
// Pages keep their own skeletons for the parts that stream in.
export default function Loading() {
  return (
    <div className='flex h-full min-h-[50vh] w-full flex-1 items-center justify-center'>
      <NexoMarkLoader />
    </div>
  )
}
