import { expect } from '@playwright/test'
import { anonTest as test, uniqueSuffix } from '../fixtures/test'

// The one error path where the UI has to show the server's own message:
// the Redis auth limiter allows 10 POSTs per IP per /api/auth/sign-in/email
// in 15 minutes, then answers 429 with `Muitas requisições`, which the
// sign-in form renders in its error banner.
//
// The whole spec runs on its own synthetic client IP (see the anon fixture),
// so tripping the limiter — and the 30 minute block that follows — cannot
// leak into the other specs or into the next run of this one.

test('shows the server rate-limit message on the sign-in form', async ({
  page,
  clientIp,
}) => {
  const email = `pw-ratelimit-${uniqueSuffix()}@example.com`

  await page.goto('/sign-in')
  const origin = new URL(page.url()).origin

  // Spend the budget through the same endpoint the form posts to.
  for (let i = 0; i < 10; i++) {
    await page.request.post(`${origin}/api/auth/sign-in/email`, {
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        'x-forwarded-for': clientIp,
      },
      data: { email, password: 'wrong-password-on-purpose' },
      failOnStatusCode: false,
    })
  }

  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('wrong-password-on-purpose')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()

  // The form retries a 429 twice on its own (~3s apart) before giving up,
  // so allow for that before the message lands.
  await expect(page.getByText('Muitas requisições')).toBeVisible({
    timeout: 30_000,
  })
  await expect(page).toHaveURL(/\/sign-in$/)
})
