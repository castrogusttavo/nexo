// Version strings for legal documents. Bump the corresponding constant
// in the same PR that changes the document's text — the value is stored
// alongside each ConsentEvent so we can prove which version a user
// accepted at a given time.
//
// Format: YYYY-MM-DD of the publication date. Keep it sortable.

export const TERMS_VERSION = '2026-05-18'
export const PRIVACY_VERSION = '2026-05-18'
export const COOKIES_VERSION = '2026-05-18'

export const LEGAL_VERSIONS = {
  TERMS: TERMS_VERSION,
  PRIVACY: PRIVACY_VERSION,
  COOKIES: COOKIES_VERSION,
} as const
