import { cn } from '@/lib/utils'

/**
 * The workspace's mark: its logo when it has one, otherwise the first letter
 * of its name. Size, radius and font size come from `className`, so the
 * switcher, the settings page and the logo dialog share one look.
 */
export function WorkspaceLogo({
  name,
  image,
  className,
}: {
  name: string
  image?: string | null
  className?: string
}) {
  if (image) {
    return (
      <img
        src={image}
        alt=''
        className={cn('shrink-0 object-cover', className)}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center bg-primary font-semibold text-primary-foreground',
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
