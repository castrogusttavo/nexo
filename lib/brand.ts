import { baseEmailUrl } from './base-email-url'

/** Brand identity shared across transactional emails and public surfaces. */
export const brand = {
  legalName: 'Nexo software, Inc.',
  displayName: 'Nexo',
  url: baseEmailUrl,
  contactEmail: 'contato@nexo.coodee.dev',
} as const

/**
 * Social channels rendered in the shared email footer. Icons are self-hosted
 * under `public/static/social/*.png` and served from `${baseEmailUrl}` — make
 * sure NEXT_PUBLIC_URL points at the public origin in production.
 */
 export const brandSocials = [
   {
     name: 'LinkedIn',
     url: 'https://www.linkedin.com/company/trynexo/',
     icon: `${baseEmailUrl}/static/social/linkedin.png`,
   },
   {
     name: 'GitHub',
     url: 'https://github.com/trynexo',
     icon: `${baseEmailUrl}/static/social/github.png`,
   },
   {
     name: 'X',
     url: 'https://x.com/trynexo',
     icon: `${baseEmailUrl}/static/social/x.png`,
   },
   {
     name: 'Instagram',
     url: 'https://instagram.com/trynexo_',
     icon: `${baseEmailUrl}/static/social/instagram.png`,
   },
 ] as const
