import { ButtonLink } from '@/components/button-link'

interface ShortCutButtonProps {
  children?: React.ReactNode
  href: string
  /** pt-BR name of the destination; the link shows only an icon. */
  label: string
}

// A link styled as an icon button, not a link inside a <button>: nesting
// them made two tab stops and left the icon-only link without a name.
export function ShortCutButton({ children, href, label }: ShortCutButtonProps) {
  return (
    <ButtonLink href={href} aria-label={label} variant='ghost' size='icon-sm'>
      {children}
    </ButtonLink>
  )
}
