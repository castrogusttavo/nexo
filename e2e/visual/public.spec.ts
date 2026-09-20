import {
  clearStatus,
  expect,
  seedStatus,
  shotName,
  stabilise,
  anonTest as test,
  VARIANTS,
} from './visual'

// The signed-out screens. Nothing here depends on a session, so the only
// moving parts are the theme, the viewport and — on /status — the rows the
// probes left in the database, which the suite writes itself.

test.beforeAll(async () => {
  await seedStatus()
})

test.afterAll(async () => {
  await clearStatus()
})

for (const variant of VARIANTS) {
  test.describe(variant.id, () => {
    test.use({ theme: variant.theme, viewport: variant.viewport })

    // The front door. Every field, the OAuth buttons and the legal footer are
    // static, so the whole page is fair game.
    test('sign-in', async ({ page }) => {
      await page.goto('/sign-in')
      await expect(
        page.getByRole('button', { name: 'Continuar', exact: true }),
      ).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('public', 'sign-in', variant.id),
        { fullPage: true },
      )
    })

    // Sign-up carries the terms/privacy checkboxes, which is the part most
    // likely to silently lose its layout.
    test('sign-up', async ({ page }) => {
      await page.goto('/sign-up')
      await expect(
        page.getByRole('button', { name: 'Criar conta', exact: true }),
      ).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('public', 'sign-up', variant.id),
        { fullPage: true },
      )
    })

    // Seven components, a 90-day bar history with one degraded day and one
    // uptime figure per component — all of it seeded, so the page is asserted
    // in full instead of being masked into a rectangle.
    test('status', async ({ page }) => {
      await page.goto('/status')
      await expect(
        page.getByRole('heading', { name: 'Status do sistema' }),
      ).toBeVisible()
      // The seeded degraded day: proof the rows reached the page and the
      // 30s snapshot cache was busted.
      await expect(page.getByText('99.97% uptime')).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('public', 'status', variant.id),
        { fullPage: true },
      )
    })
  })
}
