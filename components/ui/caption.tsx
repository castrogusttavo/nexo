'use client'

import { cva, VariantProps } from "class-variance-authority"
import {
  Caption as CaptionPrimitive,
  CaptionTextarea as CaptionTextareaPrimitive,
  useCaptionButton,
  useCaptionButtonState,
} from '@platejs/caption/react'
import { cn } from "@/lib/utils"
import { createPrimitiveComponent } from "platejs/react"
import { Button } from "./button"

const captionVariants = cva('max-w-full', {
  defaultVariants: { align: 'center' },
  variants: {
    align: {
      center: 'mx-auto',
      left: 'mr-auto',
      right: 'ml-auto',
    }
  }
})

export function Caption({ align, className, ...props }: React.ComponentProps<typeof CaptionPrimitive> & VariantProps<typeof captionVariants>) {
  return <CaptionPrimitive {...props} className={cn(captionVariants({ align }), className)} />
}

export function CaptionTextarea(props: React.ComponentProps<typeof CaptionTextareaPrimitive>) {
  return (
    <CaptionTextareaPrimitive
      {...props}
      className={cn(
        'mt-2 w-full resize-none border-none bg-inherit p-0 font-[inherit] text-inherit',
        'focus:outline-none focus:placeholder:opacity-0',
        'text-center print:placeholder:test-transparent',
        props.className
      )}
    />
  )
}

export const CaptionButton = createPrimitiveComponent(Button)({
  propsHook: useCaptionButton,
  stateHook: useCaptionButtonState
})
