'use client'

import type { ReactElement } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ColorOption<TColor extends string> {
  value: TColor
  bg: string
}

interface ColorSwatchPickerProps<TColor extends string> {
  colors: ColorOption<TColor>[]
  value: TColor
  onChange: (color: TColor) => void
  trigger: ReactElement
  shape?: 'circle' | 'square'
  align?: 'start' | 'end' | 'center'
}

export function ColorSwatchPicker<TColor extends string>({
  colors,
  value,
  onChange,
  trigger,
  shape = 'circle',
  align = 'start',
}: ColorSwatchPickerProps<TColor>) {
  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent align={align} className='w-40'>
        <div className='flex flex-wrap gap-2'>
          {colors.map((color) => (
            <button
              key={color.value}
              type='button'
              onClick={() => onChange(color.value)}
              className={cn(
                'size-6 cursor-pointer',
                shape === 'circle' ? 'rounded-full' : 'rounded-sm',
                color.bg,
                value === color.value &&
                  (shape === 'circle'
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'ring-2 ring-primary'),
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
