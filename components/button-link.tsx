import type { VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import type { ComponentProps } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>

/**
 * A navigation link that looks like a `<Button>`.
 *
 * Wrapping a `<Button>` in a `<Link>` (or the reverse) nests two interactive
 * elements: two tab stops for one control, and screen readers announce a
 * button inside a link. Base UI's `render={<Link />}` avoids the nesting but
 * needs `nativeButton={false}`, which puts `role="button"` on the anchor, so a
 * navigation reads as an action. This is a single `<a>` that keeps the link
 * role and borrows only the button's look.
 *
 * `cn` (twMerge) mirrors `<Button>`: an override such as `p-0` must replace
 * the size's `px-2.5`, not lose to it on stylesheet order.
 */
export function ButtonLink({
  variant = 'default',
  size = 'default',
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
