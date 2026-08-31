'use client'

import { cn } from "@/lib/utils"
import { TColumnElement } from "platejs"
import { PlateElement, PlateElementProps, useEditorRef, useEditorSelector, useElement, useFocusedLast, useReadOnly, useRemoveNodeButton, useSelected } from "platejs/react"
import { useRef } from "react"
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { Button } from "./button"
import { Trash2Icon } from "lucide-react"
import { Separator } from "./separator"
import { setColumns } from '@platejs/layout'

export function ColumnElement(props: PlateElementProps<TColumnElement>) {
  const { width } = props.element
  const readOnly = useReadOnly()

  return (
    <div className='group/column relative' style={{ width: width ?? '100%' }}>
      <PlateElement
        {...props}
        className='h-full px-2 pt-2 group-fir'
      >
        <div
          className={cn(
            'relative h-full border border-transparent p-1.5',
            !readOnly && 'rounded-lg border-border border-dashed'
          )}
        >
          {props.children}
        </div>
      </PlateElement>
    </div>
  )
}

export function ColumnGroupElement(props: PlateElementProps) {
  return (
    <PlateElement className='mb-2' {...props}>
      <ColumnFloatingToolbar>
        <div className='flex size-full rounded'>{props.children}</div>
      </ColumnFloatingToolbar>
    </PlateElement>
  )
}

function ColumnFloatingToolbar({ children }: React.PropsWithChildren) {
  const editor = useEditorRef()
  const readOnly = useReadOnly()
  const element = useElement<TColumnElement>()
  const { props: buttonProps } = useRemoveNodeButton({ element })
  const selected = useSelected()
  const isCollpased = useEditorSelector((editor) => editor.api.isCollapsed(), [])
  const isFocusedLast = useFocusedLast()
  const anchorRef = useRef<HTMLDivElement>(null)

  const open = isFocusedLast && !readOnly && selected && isCollpased

  const onColumnChange = (widths: string[]) => {
    setColumns(editor, { at: element, widths })
  }

  return (
    <PopoverPrimitive.Root open={open} modal={false}>
      <div ref={anchorRef}>{children}</div>
      <PopoverPrimitive.Portal
      >
        <PopoverPrimitive.Positioner
          anchor={anchorRef}
          align='center'
          side='top'
          sideOffset={10}
          className='isolate z-50 outline-none'
        >
          <PopoverPrimitive.Popup
            initialFocus={false}
            className='z-50 w-auto origin-(--transform-origin) rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'
          >
            <div className='box-content flex h-8 items-center'>
              <Button variant='ghost' className='size-8' onClick={() => onColumnChange(['50%', '50%'])}>
                <DoubleColumnOutlined />
              </Button>
              <Button variant='ghost' className='size-8' onClick={() => onColumnChange(['33%', '33%', '33%'])}>
                <ThreeColumnOutlined />
              </Button>
              <Button variant='ghost' className='size-8' onClick={() => onColumnChange(['70%', '30%'])}>
                <RightSideDoubleColumnOutlined />
              </Button>
              <Button variant='ghost' className='size-8' onClick={() => onColumnChange(['30%', '70%'])}>
                <LeftSideDoubleColumnOutlined />
              </Button>
              <Button variant='ghost' className='size-8' onClick={() => onColumnChange(['25%', '50%', '25%'])}>
                <DoubleSideDoubleColumnOutlined />
              </Button>

              <Separator orientation='vertical' className='mx-1 h-6' />
              <Button variant='ghost' className='size-8' {...buttonProps}>
                <Trash2Icon />
              </Button>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

const DoubleColumnOutlined = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill='none' height='16' viewBox='0 0 16 16' width='16' xmlns='http://www.w3.org/2000/svg' {...props}>
    <path clipRule='evenodd' d='M8.5 3H13V13H8.5V3ZM7.5 2H8.5H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H8.5H7.5H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H7.5ZM7.5 13H3L3 3H7.5V13Z' fill='currentColor' fillRule='evenodd' />
  </svg>
)

const ThreeColumnOutlined = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill='none' height='16' viewBox='0 0 16 16' width='16' xmlns='http://www.w3.org/2000/svg' {...props}>
    <path clipRule='evenodd' d='M9.25 3H6.75V13H9.25V3ZM9.25 2H6.75H5.75H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H5.75H6.75H9.25H10.25H13C13.5523 14 14 13.5523 14 13V3C14 2.44772 13.5523 2 13 2H10.25H9.25ZM10.25 3V13H13V3H10.25ZM3 13H5.75V3H3L3 13Z' fill='currentColor' fillRule='evenodd' />
  </svg>
)

const RightSideDoubleColumnOutlined = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill='none' height='16' viewBox='0 0 16 16' width='16' xmlns='http://www.w3.org/2000/svg' {...props}>
    <path clipRule='evenodd' d='M11.25 3H13V13H11.25V3ZM10.25 2H11.25H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H11.25H10.25H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H10.25ZM10.25 13H3L3 3H10.25V13Z' fill='currentColor' fillRule='evenodd' />
  </svg>
)

const LeftSideDoubleColumnOutlined = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill='none' height='16' viewBox='0 0 16 16' width='16' xmlns='http://www.w3.org/2000/svg' {...props}>
    <path clipRule='evenodd' d='M5.75 3H13V13H5.75V3ZM4.75 2H5.75H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H5.75H4.75H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H4.75ZM4.75 13H3L3 3H4.75V13Z' fill='currentColor' fillRule='evenodd' />
  </svg>
)

const DoubleSideDoubleColumnOutlined = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill='none' height='16' viewBox='0 0 16 16' width='16' xmlns='http://www.w3.org/2000/svg' {...props}>
    <path clipRule='evenodd' d='M10.25 3H5.75V13H10.25V3ZM10.25 2H5.75H4.75H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H4.75H5.75H10.25H11.25H13C13.5523 14 14 13.5523 14 13V3C14 2.44772 13.5523 2 13 2H11.25H10.25ZM11.25 3V13H13V3H11.25ZM3 13H4.75V3H3L3 13Z' fill='currentColor' fillRule='evenodd' />
  </svg>
)
