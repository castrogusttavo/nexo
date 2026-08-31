'use client'

import type { TImageElement } from 'platejs'
import type { PlateElementProps } from 'platejs/react'
import { Image, ImagePlugin, useMediaState } from '@platejs/media/react'
import { ResizableProvider, useResizableValue } from '@platejs/resizable'
import { PlateElement, withHOC } from 'platejs/react'
import { cn } from '@/lib/utils'
import { Caption, CaptionTextarea } from './caption'
import { MediaToolbar } from './media-toolbar'
import { mediaResizeHandleVariants, Resizable, ResizeHandle } from './resize-handle'

export const ImageElement = withHOC(
  ResizableProvider,
  function ImageElement(props: PlateElementProps<TImageElement>) {
    const { align = 'center', focused, readOnly, selected } = useMediaState()
    const width = useResizableValue('width')

    return (
      <MediaToolbar plugin={ImagePlugin}>
        <PlateElement {...props} className='py-2.5'>
          <figure className='group relative m-0' contentEditable={false}>
            <Resizable align={align} options={{ align, readOnly }}>
              <ResizeHandle className={mediaResizeHandleVariants({ direction: 'left' })} options={{ direction: 'left' }} />
              <div>
                <Image
                  className={cn(
                    'block w-full max-w-full cursor-pointer object-cover px-0 rounded-sm',
                    focused && selected && 'ring-2 ring-ring ring-offset-2'
                  )}
                  alt={props.attributes.alt as string | undefined}
                />
              </div>
              <ResizeHandle className={mediaResizeHandleVariants({ direction: 'right' })} options={{ direction: 'right' }} />
            </Resizable>
            <Caption style={{ width }} align={align}>
              <CaptionTextarea
                readOnly={readOnly}
                onFocus={(e) => e.preventDefault()}
                placeholder='Escreva uma legenda...'
              />
            </Caption>
          </figure>
          {props.children}
        </PlateElement>
      </MediaToolbar>
    )
  }
)
