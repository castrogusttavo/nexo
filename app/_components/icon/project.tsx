import { JoinStraightIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'

export function ProjectIcon() {
  return (
    <>
      <NexoIcon
        icon={JoinStraightIcon}
        className='absolute top-2 right-2 size-3 rotate-180'
      />
      <NexoIcon
        icon={JoinStraightIcon}
        className='absolute bottom-2 left-2 size-3'
      />
    </>
  )
}
