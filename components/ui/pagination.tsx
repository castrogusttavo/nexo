import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MoreHorizontalCircle01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { HugeiconsIcon } from '@hugeicons/react'
import type { VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import type * as React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/*
 * Two families, picked by where the page lives:
 *
 * - `PaginationLink` / `PaginationPrevious` / `PaginationNext` — the page is
 *   in the url. Each control navigates, so it is a real `<a href>` (next/link)
 *   and keeps the link role.
 * - `PaginationButton` / `PaginationPreviousButton` / `PaginationNextButton` —
 *   the page is component state. Nothing is navigated to, so each control is a
 *   real `<button type="button">`.
 *
 * The previous version rendered an `<a>` through Base UI's `nativeButton=
 * {false}`, which stamps `role="button"` on it: url pages were announced as
 * actions, and state pages were anchors without href faking a button.
 *
 * Both families mark the current page with `aria-current="page"`.
 */

type PaginationSize = VariantProps<typeof buttonVariants>['size']

function paginationClassName(
  isActive: boolean | undefined,
  size: PaginationSize,
  className?: string,
) {
  return cn(
    buttonVariants({ variant: isActive ? 'outline' : 'ghost', size }),
    className,
  )
}

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      aria-label='Paginação'
      data-slot='pagination'
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot='pagination-content'
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot='pagination-item' {...props} />
}

type PaginationControlProps = {
  isActive?: boolean
  size?: PaginationSize
}

type PaginationLinkProps = PaginationControlProps &
  React.ComponentProps<typeof Link>

function PaginationLink({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps) {
  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      data-slot='pagination-link'
      data-active={isActive}
      className={paginationClassName(isActive, size, className)}
      {...props}
    />
  )
}

type PaginationButtonProps = PaginationControlProps &
  React.ComponentProps<'button'>

function PaginationButton({
  className,
  isActive,
  size = 'icon',
  type = 'button',
  ...props
}: PaginationButtonProps) {
  return (
    <button
      type={type}
      aria-current={isActive ? 'page' : undefined}
      data-slot='pagination-link'
      data-active={isActive}
      className={paginationClassName(isActive, size, className)}
      {...props}
    />
  )
}

const PREVIOUS_LABEL = 'Ir para a página anterior'
const NEXT_LABEL = 'Ir para a próxima página'

function PreviousContent({ text }: { text: string }) {
  return (
    <>
      <HugeiconsIcon
        icon={ArrowLeft01Icon}
        strokeWidth={2}
        data-icon='inline-start'
      />
      <span className='hidden sm:block'>{text}</span>
    </>
  )
}

function NextContent({ text }: { text: string }) {
  return (
    <>
      <span className='hidden sm:block'>{text}</span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        data-icon='inline-end'
      />
    </>
  )
}

type WithText = { text?: string }

function PaginationPrevious({
  className,
  text = 'Anterior',
  ...props
}: PaginationLinkProps & WithText) {
  return (
    <PaginationLink
      aria-label={PREVIOUS_LABEL}
      size='default'
      className={cn('pl-2!', className)}
      {...props}
    >
      <PreviousContent text={text} />
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text = 'Próxima',
  ...props
}: PaginationLinkProps & WithText) {
  return (
    <PaginationLink
      aria-label={NEXT_LABEL}
      size='default'
      className={cn('pr-2!', className)}
      {...props}
    >
      <NextContent text={text} />
    </PaginationLink>
  )
}

function PaginationPreviousButton({
  className,
  text = 'Anterior',
  ...props
}: PaginationButtonProps & WithText) {
  return (
    <PaginationButton
      aria-label={PREVIOUS_LABEL}
      size='default'
      className={cn('pl-2!', className)}
      {...props}
    >
      <PreviousContent text={text} />
    </PaginationButton>
  )
}

function PaginationNextButton({
  className,
  text = 'Próxima',
  ...props
}: PaginationButtonProps & WithText) {
  return (
    <PaginationButton
      aria-label={NEXT_LABEL}
      size='default'
      className={cn('pr-2!', className)}
      {...props}
    >
      <NextContent text={text} />
    </PaginationButton>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  // Decorative: the gap is already evident from the page numbers either side.
  return (
    <span
      aria-hidden
      data-slot='pagination-ellipsis'
      className={cn(
        "flex size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
    </span>
  )
}

export {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationNextButton,
  PaginationPrevious,
  PaginationPreviousButton,
}
