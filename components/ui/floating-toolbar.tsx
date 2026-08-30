'use client'

import { useEditorId, useEventEditorValue } from "platejs/react";
import { Toolbar } from "./toolbar";
import { flip, type FloatingToolbarState, offset, useFloatingToolbar, useFloatingToolbarState } from '@platejs/floating'
import { useComposedRef } from '@udecode/cn'
import { cn } from "@/lib/utils";

export function FloatingToolbar({
  children,
  className,
  state,
  ...props
}: React.ComponentProps<typeof Toolbar> & { state?: FloatingToolbarState }) {
  const editorId = useEditorId()
  const focusedEditorId = useEventEditorValue('focus')

  const floatingToolbarState = useFloatingToolbarState({
    editorId,
    focusedEditorId,
    ...state,
    floatingOptions: {
      middleware: [
        offset(12),
        flip({
          fallbackPlacements: [
            'top-start',
            'top-end',
            'bottom-start',
            'bottom-end'
          ],
          padding: 12
        })
      ],
      placement: 'top',
      ...state?.floatingOptions
    }
  })

  const {
    clickOutsideRef,
    hidden,
    props: rootProps,
    ref: floatingRef
  } = useFloatingToolbar(floatingToolbarState)

  const ref = useComposedRef<HTMLDivElement>(props.ref, floatingRef)

  if (hidden) return null

  return (
    <div ref={clickOutsideRef}>
      <Toolbar
        {...props}
        {...rootProps}
        ref={ref}
        className={cn(
          'scrollbar-hide absolute z-50 overflow-x-auto whitespace-nowrap rounded-md border bg-popover p-1 opacity-100 shadow-md print:hidden',
          'max-w-[80vw]',
          className
        )}
      >
        {children}
      </Toolbar>
    </div>
  )
}
