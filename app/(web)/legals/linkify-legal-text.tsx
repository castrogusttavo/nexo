import Link from 'next/link'
import type { ReactNode } from 'react'

// Casa e-mails e referências a nexo.coodee.dev (com ou sem "docs.", com ou
// sem caminho) dentro do texto corrido dos documentos legais.
const LEGAL_REFERENCE_REGEX =
  /((?:docs\.)?nexo\.coodee\.dev(?:\/[A-Za-z0-9-/]*)?|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g

const LINK_CLASSNAME = 'font-bold underline'

function resolveHref(match: string): { href: string; external: boolean } {
  if (match.includes('@')) return { href: `mailto:${match}`, external: true }
  if (match.startsWith('docs.'))
    return { href: `https://${match}`, external: true }
  return {
    href: match.replace(/^nexo\.coodee\.dev/, '') || '/',
    external: false,
  }
}

export function linkifyLegalText(text: string): ReactNode {
  const parts = text.split(LEGAL_REFERENCE_REGEX)
  if (parts.length === 1) return text

  return parts.map((part, index) => {
    // split() com um grupo de captura intercala texto/match/texto/match...
    // — índices pares são texto puro, ímpares são as referências casadas.
    if (index % 2 === 0) return part

    const { href, external } = resolveHref(part)
    const key = `${part}-${index}`

    if (external) {
      return (
        <a key={key} href={href} className={LINK_CLASSNAME}>
          {part}
        </a>
      )
    }

    return (
      <Link key={key} href={href} className={LINK_CLASSNAME}>
        {part}
      </Link>
    )
  })
}
