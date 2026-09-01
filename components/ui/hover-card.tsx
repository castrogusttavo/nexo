'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { cn } from '@/lib/utils'

interface HoverCardContextValue {
  open: boolean
  openDelay: number
  closeDelay: number
  timeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>
  setOpen: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement | null>
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null)

function useHoverCardContext() {
  const context = React.useContext(HoverCardContext)
  if (!context) throw new Error('HoverCard subcomponents must be used inside <HoverCard>')
  return context
}

interface HoverCardProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  openDelay?: number
  closeDelay?: number
  children: React.ReactNode
}

function HoverCard({ open: openProp, onOpenChange, openDelay = 300, closeDelay = 150, children }: HoverCardProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = openProp ?? internalOpen
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const anchorRef = React.useRef<HTMLElement | null>(null)

  const setOpen = React.useCallback(
    (value: boolean) => {
      setInternalOpen(value)
      onOpenChange?.(value)
    },
    [onOpenChange]
  )

  return (
    <HoverCardContext.Provider value={{ open, openDelay, closeDelay, timeoutRef, setOpen, anchorRef }}>
      <PopoverPrimitive.Root open={open} modal={false}>
        {children}
      </PopoverPrimitive.Root>
    </HoverCardContext.Provider>
  )
}

function HoverCardTrigger({ children }: { children: React.ReactElement<React.HTMLAttributes<HTMLElement>> }) {
  const { openDelay, closeDelay, timeoutRef, setOpen, anchorRef } = useHoverCardContext()

  const handleEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(true), openDelay)
    children.props.onMouseEnter?.(event)
  }

  const handleLeave = (event: React.MouseEvent<HTMLElement>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(false), closeDelay)
    children.props.onMouseLeave?.(event)
  }

  return React.cloneElement(children, {
    ref: anchorRef,
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
  } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> })
}

function HoverCardContent({ className, ...props }: React.ComponentProps<typeof PopoverPrimitive.Popup>) {
  const { anchorRef, timeoutRef, closeDelay, setOpen } = useHoverCardContext()

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner anchor={anchorRef} align='center' side='top' sideOffset={8} className='isolate z-50 outline-none'>
        <PopoverPrimitive.Popup
          initialFocus={false}
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
          }}
          onMouseLeave={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => setOpen(false), closeDelay)
          }}
          className={cn(
            'z-50 w-64 origin-(--transform-origin) rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
