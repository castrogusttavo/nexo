import { expect, test } from '../fixtures/test'

test.describe('context sidebar', () => {
  test('collapses Projetos, stays collapsed after a reload and opens from the header', async ({
    page,
    account,
  }) => {
    await page.goto(`/${account.workspaceSlug}/projects`)
    const sidebar = page.locator('#context-sidebar-projects:visible')
    const expand = page.getByRole('button', { name: 'Expandir barra lateral' })
    await expect(sidebar).toBeVisible()
    await expect(expand).toBeHidden()

    await page.getByRole('button', { name: 'Recolher barra lateral' }).click()
    await expect(sidebar).toBeHidden()
    await expect(expand).toBeVisible()

    // A full load paints it collapsed straight away: the inline script marks
    // <html> before the body is parsed.
    await page.reload()
    expect(
      await page.evaluate(() =>
        document.documentElement.getAttribute('data-sidebar-projects'),
      ),
    ).toBe('closed')
    await expect(sidebar).toBeHidden()

    await expand.click()
    await expect(sidebar).toBeVisible()
    await page.reload()
    await expect(sidebar).toBeVisible()
  })

  test('never offers to collapse the settings sidebar', async ({
    page,
    account,
  }) => {
    await page.goto(`/${account.workspaceSlug}/settings/members`)

    await expect(
      page.getByRole('button', { name: /barra lateral/ }),
    ).toHaveCount(0)
  })
})
