import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

const changelogTagVariants = cva('rounded-sm px-2.5 py-1.5 h-fit text-sm', {
  variants: {
    variant: {
      new: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      bug: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
      enchement:
        'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    },
  },
  defaultVariants: {
    variant: 'new',
  },
})

export function ChangelogTag({
  variant,
  children,
}: { children: ReactNode } & VariantProps<typeof changelogTagVariants>) {
  return <Badge className={changelogTagVariants({ variant })}>{children}</Badge>
}
