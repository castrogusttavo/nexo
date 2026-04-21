'use client'

import { Alert01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { Button } from '@/components/ui/button'
import { NexoIcon } from '../components/icon/icon'

export default function Page() {
  return (
    <div className='-mt-8 max-w-82 py-8 px-7 text-left h-screen mx-auto flex flex-col justify-center'>
      <NexoIcon
        icon={Alert01Icon}
        color='#ededed'
        size={40}
        strokeWidth={2}
        className='mb-6'
      />
      <h1 className='text-2xl font-medium leading-8 mb-3 text-[#ededed]'>
        This page couldn’t load
      </h1>
      <p className='text-sm font-normal leading-5 mb-5 text-[#ededed]'>
        A server error occurred. Reload to try again.
      </p>
      <div className='flex items-center gap-2'>
        <Button size={'sm'} onClick={() => (window.location.href = '/')}>
          Home
        </Button>
        <Button
          variant={'secondary'}
          size={'sm'}
          onClick={() => window.location.reload()}
        >
          Reload
        </Button>
      </div>
    </div>
  )
}
