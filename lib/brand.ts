import { baseEmailUrl } from './base-email-url'

/** Brand identity shared across transactional emails and public surfaces. */
export const brand = {
  /** Razão social of the MEI that bills customers (Receita Federal registry). */
  legalName: '69.225.330 GUSTTAVO LEANDRO DE CASTRO TAVARES',
  /** Nome fantasia — how the legal entity presents itself in contracts. */
  tradeName: 'Nexo Software',
  cnpj: '69.225.330/0001-81',
  displayName: 'Nexo',
  url: baseEmailUrl,
  contactEmail: 'contato@nexopm.com',
} as const

/**
 * Social channels rendered in the shared email footer. Icons are hotlinked
 * from Brandfetch's CDN (dark-theme variants) rather than self-hosted.
 */
 export const brandSocials = [
   {
     name: 'LinkedIn',
     url: 'https://www.linkedin.com/company/nexoso',
     icon: 'https://cdn.brandfetch.io/idJFz6sAsl/w/400/h/400/theme/dark/icon.png?c=1bxid64Mup7aczewSAYMX&t=1748592533197',
   },
   {
     name: 'GitHub',
     url: 'https://github.com/castrogusttavo/nexo',
     icon: 'https://cdn.brandfetch.io/idZAyF9rlg/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1779162684348',
   },
   {
     name: 'X',
     url: 'https://x.com/trynexo',
     icon: 'https://cdn.brandfetch.io/idS5WhqBbM/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1692089092800',
   },
 ] as const
