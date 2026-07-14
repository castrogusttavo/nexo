// Role-based mail addresses for nexo.coodee.dev — one address per function,
// not per person. Outbound transactional mail goes out via `notifications`
// with Reply-To pointing at a human inbox; receive-only addresses exist for
// inbound (Resend) and legal/public listing. Keep this file in sync with the
// Resend domain + inbound configuration.

export const mailDomain = 'nexo.coodee.dev'

const displayName = 'nexo'

function sender(localPart: string): string {
  return `${displayName} <${localPart}@${mailDomain}>`
}

export const mailAddresses = {
  /** Transactional (send-only): verification, OTP, reset, invites, exports. */
  notifications: `notificacoes@${mailDomain}`,
  /** Human support inbox; default Reply-To for transactional mail. */
  support: `suporte@${mailDomain}`,
  /** Public-facing contact (site footer, social profiles, WhatsApp). */
  contact: `contato@${mailDomain}`,
  /** Enterprise "talk to sales" flow and commercial inquiries. */
  sales: `vendas@${mailDomain}`,
  /** Billing: receipts, payment failures, invoices (AbacatePay). */
  billing: `financeiro@${mailDomain}`,
  /** Vulnerability disclosure (also listed in security.txt). */
  security: `seguranca@${mailDomain}`,
  /** Job applications inbox (careers page, job boards). */
  careers: `vagas@${mailDomain}`,
  /** LGPD data-subject requests (privacy policy contact). */
  privacy: `privacidade@${mailDomain}`,
  /** Status page incident/maintenance notifications (send-only). */
  status: `status@${mailDomain}`,
} as const

/** Formatted From headers for the addresses we actually send from. */
export const mailSenders = {
  notifications: sender('notificacoes'),
  support: sender('suporte'),
  sales: sender('vendas'),
  billing: sender('financeiro'),
  status: sender('status'),
} as const

/** Default Reply-To for transactional mail sent from `notifications`. */
export const defaultReplyTo = mailAddresses.support
