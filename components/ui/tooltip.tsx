"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import * as React from "react"

import { cn } from "@/lib/utils"

// Base UI's tooltip is purely visual: its popup has no role and the trigger
// is never linked to it, so the text is invisible to assistive tech. The
// root shares an id with the popup, and the popup registers itself while it
// is mounted and visible, so the trigger is only described by an element
// that is actually in the document.
type TooltipA11y = {
  id: string
  describedBy: string | undefined
  setDescribedBy: (id: string | undefined) => void
}

const TooltipA11yContext = React.createContext<TooltipA11y | null>(null)

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  const id = React.useId()
  const [describedBy, setDescribedBy] = React.useState<string>()
  const a11y = React.useMemo(
    () => ({ id, describedBy, setDescribedBy }),
    [id, describedBy]
  )

  return (
    <TooltipProvider>
      <TooltipA11yContext.Provider value={a11y}>
        <TooltipPrimitive.Root data-slot="tooltip" {...props} />
      </TooltipA11yContext.Provider>
    </TooltipProvider>
  )
}

function TooltipTrigger({
  "aria-describedby": ownDescribedBy,
  ...props
}: TooltipPrimitive.Trigger.Props) {
  const a11y = React.useContext(TooltipA11yContext)
  const describedBy =
    [ownDescribedBy, a11y?.describedBy].filter(Boolean).join(" ") || undefined

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      aria-describedby={describedBy}
      {...props}
    />
  )
}

/** Links the trigger to the popup for as long as the popup is mounted. */
function TooltipDescription() {
  const a11y = React.useContext(TooltipA11yContext)
  const id = a11y?.id
  const setDescribedBy = a11y?.setDescribedBy

  React.useLayoutEffect(() => {
    if (!id || !setDescribedBy) return
    setDescribedBy(id)
    return () => setDescribedBy(undefined)
  }, [id, setDescribedBy])

  return null
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  hidden,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  const a11y = React.useContext(TooltipA11yContext)

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 rounded-md px-3 py-1.5 text-xs data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 bg-foreground text-background z-50 w-fit max-w-xs origin-(--transform-origin)",
            className
          )}
          hidden={hidden}
          {...props}
          id={a11y?.id ?? props.id}
          role="tooltip"
        >
          {/* A hidden popup (e.g. the sidebar's, while expanded) must not
              describe its trigger. */}
          {!hidden && <TooltipDescription />}
          {children}
          <TooltipPrimitive.Arrow className="size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 bg-foreground fill-foreground z-50 data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
