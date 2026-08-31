'use client'

import type { TVideoElement } from 'platejs'
import type { PlateElementProps } from 'platejs/react'
import { useDraggable } from '@platejs/dnd'
import { useMediaState } from '@platejs/media/react'
import { ResizableProvider, useResizableValue } from '@platejs/resizable'
import { PlateElement, withHOC } from 'platejs/react'
import { cn } from '@/lib/utils'
import { Caption, CaptionTextarea } from './caption'
import { mediaResizeHandleVariants, Resizable, ResizeHandle } from './resize-handle'

export const VideoElement = withHOC(
  ResizableProvider,
  function VideoElement(props: PlateElementProps<TVideoElement>) {
    const { align = 'center', readOnly, unsafeUrl } = useMediaState()
    const width = useResizableValue('width')
    const { isDragging, handleRef } = useDraggable({ element: props.element })

    return (
      <PlateElement className='py-2.5' {...props}>
        <figure className='group relative m-0 cursor-default' contentEditable={false}>
          <Resizable className={cn(isDragging && 'opacity-50')} align={align} options={{ align, readOnly }}>
            <ResizeHandle className={mediaResizeHandleVariants({ direction: 'left' })} options={{ direction: 'left' }} />
            <ResizeHandle className={mediaResizeHandleVariants({ direction: 'right' })} options={{ direction: 'right' }} />
            <div ref={handleRef}>
              <video className='w-full max-w-full rounded-sm object-cover px-0' src={unsafeUrl} controls />
            </div>
          </Resizable>

          <Caption style={{ width }} align={align}>
            <CaptionTextarea readOnly={readOnly} placeholder='Escreva uma legenda...' />
          </Caption>
        </figure>
        {props.children}
      </PlateElement>
    )
  }
)
