'use client'

import * as React from 'react'
import type { TExcalidrawElement } from '@platejs/excalidraw'
import type { PlateElementProps } from 'platejs/react'
import { useExcalidrawElement } from '@platejs/excalidraw/react'
import { PlateElement, useReadOnly } from 'platejs/react'
import { EXCALIDRAW_ASSET_PATH } from '@/lib/excalidraw/asset-path'
import { cn } from '@/lib/utils'
import '@excalidraw/excalidraw/index.css'

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[]
  }
}

// Must be set before excalidraw registers its fonts. useExcalidrawElement
// imports the package lazily from an effect, so module scope runs first.
// Without it the fonts come from esm.sh and the CSP (font-src 'self') blocks
// them; next.config.ts copies them to this path.
if (typeof window !== 'undefined') {
  window.EXCALIDRAW_ASSET_PATH = EXCALIDRAW_ASSET_PATH
}

export function ExcalidrawElement(props: PlateElementProps<TExcalidrawElement>) {
  const { children, element } = props
  const readOnly = useReadOnly()

  const { Excalidraw, excalidrawProps } = useExcalidrawElement({ element })

  return (
    <PlateElement {...props}>
      <div contentEditable={false}>
        <div className={cn('mx-auto aspect-video h-[600px] w-[min(100%,600px)] overflow-hidden rounded-sm border')}>
          {Excalidraw && (
            // biome-ignore lint/suspicious/noExplicitAny: excalidrawProps' shape comes untyped from @platejs/excalidraw
            <Excalidraw {...(excalidrawProps as any)} viewModeEnabled={readOnly} />
          )}
        </div>
      </div>
      {children}
    </PlateElement>
  )
}
