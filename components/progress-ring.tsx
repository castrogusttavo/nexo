'use client'

import { useEffect, useState } from 'react'

type ProgressRingProps = {
  value: number
  size?: number
  strokeWidth?: number
}

export function ProgressRing({
  value,
  size = 16,
  strokeWidth = 2,
}: ProgressRingProps) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(id)
  }, [value])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset =
    circumference - (Math.min(Math.max(shown, 0), 100) / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className='-rotate-90'
      aria-hidden='true'
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill='none'
        strokeWidth={strokeWidth}
        className='stroke-primary/10'
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill='none'
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className='stroke-primary transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none'
      />
    </svg>
  )
}