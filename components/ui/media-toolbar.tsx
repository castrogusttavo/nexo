'use client'

import { cva } from "class-variance-authority"
import { WithRequiredKey } from "platejs";
import { useEditorRef, useEditorSelector, useElement, useFocusedLast, useReadOnly, useRemoveNodeButton, useSelected } from "platejs/react";
import {
  FloatingMedia as FloatingMediaPrimitive,
  FloatingMediaStore,
  useFloatingMediaValue,
  useImagePreviewValue,
} from '@platejs/media/react'
import { useEffect, useRef } from "react";
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { Link, Trash2Icon } from "lucide-react";
import { CaptionButton } from "./caption";
import { Separator } from "./separator";
import { Button, buttonVariants } from "./button";

const inputVariants = cva(
  'flex h-[28px] w-full rounded-md border-none bg-transparent px-1.5 py-1 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-transparent md:text-sm'
)

export function MediaToolbar({ children, plugin }: { children: React.ReactNode; plugin: WithRequiredKey }) {
  const editor = useEditorRef()
  const readOnly = useReadOnly()
  const selected = useSelected()
  const isFocusedLast = useFocusedLast()
  const selectionCollapsed = useEditorSelector((editor) => !editor.api.isExpanded(), [])
  const isImagePreviewOpen = useImagePreviewValue('isOpen', editor.id)
  const open = isFocusedLast && !readOnly && selected && selectionCollapsed && !isImagePreviewOpen
  const isEditing = useFloatingMediaValue('isEditing')

  useEffect(() => {
    if (!open && isEditing) {
      FloatingMediaStore.set('isEditing', false)
    }
  }, [open])

  const element = useElement()
  const { props: buttonProps } = useRemoveNodeButton({ element })
  const anchorRef = useRef<HTMLDivElement>(null)

  return (
    <PopoverPrimitive.Root open={open} modal={false}>
      <div ref={anchorRef}>{children}</div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={anchorRef}
          align='center'
          side='bottom'
          sideOffset={4}
          className='isolate z-50 outline-none'
        >
          <PopoverPrimitive.Popup
            initialFocus={false}
            className='z-50 w-auto origin-(--transform-origin) rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'
          >
            {isEditing ? (
              <div className='flex w-82 flex-col'>
                <div className='flex items-center'>
                  <div className='flex items-center pr-1 pl-2 text-muted-foreground'>
                    <Link className='size-4' />
                  </div>
                  <FloatingMediaPrimitive.UrlInput
                    className={inputVariants()}
                    placeholder='Cole o link...'
                    options={{ plugin }}
                  />
                </div>
              </div>
            ) : (
              <div className='box-content flex items-center'>
                <FloatingMediaPrimitive.EditButton className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
                  Editar link
                </FloatingMediaPrimitive.EditButton>

                <CaptionButton size='sm' variant='ghost'>
                  Legenda
                </CaptionButton>

                <Separator orientation='vertical' className='mx-1 h-6' />

                <Button size='sm' variant='ghost' {...buttonProps}>
                  <Trash2Icon />
                </Button>
              </div>
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
