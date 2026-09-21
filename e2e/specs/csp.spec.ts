import { readdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

// Regression guard for the pair of bugs that left production unprotected and
// would have left it unusable the moment it was protected:
//
// 1. `.dockerignore` listed proxy.ts, so the deployed image had no middleware
//    at all — no CSP, no HSTS, no edge auth gate.
// 2. The CSP it *would* have sent used a per-request nonce with
//    'strict-dynamic'. With cacheComponents the shell is prerendered at build
//    time, so its scripts carry no nonce and 'strict-dynamic' makes browsers
//    ignore 'self': Chromium blocked 27 scripts and the app never hydrated.
//
// The suite runs without bypassCSP against the standalone server, so both
// come back as failures here rather than as a dead page in production.

test.describe('content security policy', () => {
  test('is sent on a public page and refuses foreign scripts', async ({
    request,
    baseURL,
  }) => {
    const response = await request.get(`${baseURL}/sign-in`)
    const csp = response.headers()['content-security-policy']

    expect(csp, 'no CSP header: is proxy.ts reaching the build?').toBeTruthy()
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    // 'strict-dynamic' would make the browser ignore 'self' and block every
    // prerendered chunk; a nonce cannot cover a shell built ahead of time.
    expect(csp).not.toContain('strict-dynamic')
    expect(csp).not.toContain('nonce-')
  })

  test('the sign-in form hydrates under the real CSP', async ({ page }) => {
    const violations: string[] = []
    page.on('console', (message) => {
      if (/Content Security Policy/i.test(message.text())) {
        violations.push(message.text())
      }
    })

    await page.goto('/sign-in')
    // Client-side validation only runs once React has hydrated, so this
    // fails if the CSP blocked the bootstrap scripts.
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await expect(page.getByText('E-mail é obrigatório')).toBeVisible()

    expect(violations, violations.slice(0, 3).join('\n')).toEqual([])
  })

  test('the edge gate redirects an anonymous visitor', async ({ page }) => {
    // Without the middleware in the image this answered 200 and rendered the
    // private shell instead of bouncing to sign-in.
    await page.goto('/any-workspace/projects')
    await expect(page).toHaveURL(/\/sign-in\?redirect=/)
  })

  // Static assets stay outside the proxy. The excalidraw fonts are copied
  // into public/ at build time, and the matcher used to let them through
  // the auth gate: a visitor without a session got a redirect instead of the
  // font. The file is picked from disk because its name is hashed per
  // excalidraw version.
  test('serves self-hosted fonts without the auth gate', async ({
    request,
    baseURL,
  }) => {
    const dir = path.join(
      'public',
      'static',
      'excalidraw',
      'fonts',
      'Excalifont',
    )
    const font = readdirSync(dir).find((name) => name.endsWith('.woff2'))
    expect(
      font,
      `no .woff2 in ${dir}: did the build sync the fonts?`,
    ).toBeTruthy()

    const response = await request.get(
      `${baseURL}/static/excalidraw/fonts/Excalifont/${font}`,
      { maxRedirects: 0 },
    )

    expect(response.status()).toBe(200)
    // Static files get next.config.ts's asset policy (default-src 'none'),
    // not the page policy the proxy stamps -- proof the proxy was skipped.
    const csp = response.headers()['content-security-policy'] ?? ''
    expect(csp).toContain("default-src 'none'")
    expect(csp).not.toContain("'unsafe-inline'; style-src")
  })
})
