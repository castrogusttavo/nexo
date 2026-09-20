import { expect, shotName, stabilise, test, VARIANTS } from './visual'

// The signed-in shell: the home screen a member lands on and the project list.
// Both are seeded by the worker-scoped `showcase` fixture, so the sidebar tree
// and the cards hold the same three projects on every run.

for (const variant of VARIANTS) {
  test.describe(variant.id, () => {
    test.use({ theme: variant.theme, viewport: variant.viewport })

    // The workspace shell: sidebar, header, quick links and the notes widget.
    test('home', async ({ page, showcase }) => {
      await page.goto(`/${showcase.workspaceSlug}`)
      await expect(page.getByText('Links rápidos')).toBeVisible()
      await expect(page.getByText('Suas anotações')).toBeVisible()
      await stabilise(page)

      // The greeting and the long date are rendered on the *server*, inside a
      // `'use cache'` boundary with cacheLife('hours') — the page clock cannot
      // reach them, and the words change three times a day. Masking those two
      // lines is cheaper than owning the server's clock, and it is the only
      // mask on this screen.
      const greeting = page
        .getByRole('heading', { name: /(Bom dia|Boa tarde|Boa noite), Ana/ })
        .locator('..')

      await expect(page).toHaveScreenshot(
        shotName('workspace', 'home', variant.id),
        { fullPage: true, mask: [greeting] },
      )
    })

    // Three project cards with fixed names, descriptions and a single member
    // avatar each.
    test('project-list', async ({ page, showcase }) => {
      await page.goto(`/${showcase.workspaceSlug}/projects`)
      await expect(page.getByText('Plataforma').first()).toBeVisible()
      await expect(page.getByText('Design System').first()).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('workspace', 'project-list', variant.id),
        { fullPage: true },
      )
    })
  })
}
