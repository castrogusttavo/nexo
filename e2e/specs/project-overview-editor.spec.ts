import { expect, test } from '../fixtures/test'

// Waiting for the project overview to host <TextEditor>: until then there is no
// page to open, so these would time out on a blank one. Drop the fixme, open
// `/${account.workspaceSlug}/projects/${slug}/overview` and request the
// `account` fixture (see wiki-editor.spec.ts) when the page exists.
test.describe('project overview text editor', () => {
  test.fixme(true, 'the overview does not render <TextEditor> yet')

  test('"/" opens the command menu and inserts a block', async ({ page }) => {
    const body = page.locator('[data-slate-editor="true"]').first()
    await body.click()
    await page.keyboard.type('/')

    await expect(page.getByRole('option', { name: 'Título 1' })).toBeVisible()
    await page.getByRole('option', { name: 'Título 1' }).click()
    await page.keyboard.type('Plano')

    await expect(body.locator('h1')).toHaveText('Plano')
  })

  test('has no fixed toolbar', async ({ page }) => {
    await expect(
      page.locator('[data-slate-editor="true"]').first(),
    ).toBeVisible()
    await expect(page.locator('[data-slot="fixed-toolbar"]')).toHaveCount(0)
  })
})
