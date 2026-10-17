import type { IconSvgElement } from '@hugeicons/react'
import { createElement } from 'react'

// For an icon repeated hundreds of times on one page (the pricing table): the
// paths go into the document once, as <symbol>s, and every use is a ~80-byte
// <use> instead of ~500 bytes of inline <path>s in the HTML and again in the
// RSC payload. The sprite is sized to nothing rather than display:none, which
// some browsers refuse to reference from <use>.
export function IconSprite({
  icons,
  strokeWidth,
}: {
  icons: Record<string, IconSvgElement>
  strokeWidth?: number
}) {
  return (
    <svg
      aria-hidden
      width={0}
      height={0}
      className='absolute overflow-hidden'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        {Object.entries(icons).map(([id, elements]) => (
          <symbol key={id} id={id} viewBox='0 0 24 24'>
            {elements.map(([tag, { key, ...attrs }]) =>
              createElement(tag, {
                key,
                ...attrs,
                ...(strokeWidth === undefined ? {} : { strokeWidth }),
              }),
            )}
          </symbol>
        ))}
      </defs>
    </svg>
  )
}

/** One use of an icon from an IconSprite rendered on the same page. */
export function SpriteIcon({
  id,
  size = 16,
  className,
}: {
  id: string
  size?: number
  className?: string
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      className={className}
    >
      <use href={`#${id}`} />
    </svg>
  )
}
