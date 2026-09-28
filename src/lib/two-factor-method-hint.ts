/**
 * Remembers, per browser, which second factor this person used last.
 *
 * The sign-in page cannot ask the server which factor an account enrolled:
 * there is no session yet, and answering would tell anyone who reaches the
 * password step what a given address uses. So the hint is kept locally, where
 * it is nobody else's business, and used for one thing only — deciding whether
 * to mail a code before the person has asked for one. Someone who uses an
 * authenticator app was getting an e-mail they would never open on every
 * single sign-in.
 *
 * It is a convenience, never a gate: a wrong or missing hint costs one click,
 * and every factor stays reachable from the page regardless of what it says.
 */
export type TwoFactorMethod = 'otp' | 'totp'

const KEY = 'nexo.2fa.method'

export function rememberTwoFactorMethod(method: TwoFactorMethod): void {
  try {
    window.localStorage.setItem(KEY, method)
  } catch {
    // Private windows, blocked site data, or a browser that simply refuses.
    // The hint is optional by design.
  }
}

export function lastTwoFactorMethod(): TwoFactorMethod | null {
  try {
    const stored = window.localStorage.getItem(KEY)
    return stored === 'otp' || stored === 'totp' ? stored : null
  } catch {
    return null
  }
}
