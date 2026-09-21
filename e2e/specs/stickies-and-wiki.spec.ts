import { expect, test, uniqueSuffix } from '../fixtures/test'

// Two autosaving surfaces: a sticky note (TipTap, debounced PATCH, flushed on
// blur) and a wiki page (title saved on blur). Both must survive a reload.

test.describe('stickies and wiki', () => {
  test('creates a sticky note that survives a reload', async ({
    page,
    account,
  }) => {
    const text = `Anotação ${uniqueSuffix()}`

    await page.goto(`/${account.workspaceSlug}/stickies`)
    await expect(page.getByText('Nenhuma anotação ainda.')).toBeVisible()

    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith('/api/sticky-notes') &&
          r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Adicionar sticky' }).click(),
    ])
    await expect(page.getByText('Sticky criado')).toBeVisible()

    const editor = page.locator('[contenteditable="true"]').first()
    await editor.click()
    await editor.fill(text)

    // The editor debounces, then flushes on blur — wait for the PATCH itself
    // rather than for a fixed delay.
    const [patch] = await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/api\/sticky-notes\/[^/]+$/.test(r.url()) &&
          r.request().method() === 'PATCH',
      ),
      editor.blur(),
    ])
    expect(patch.status()).toBe(200)

    await page.reload()
    await expect(page.getByText(text)).toBeVisible()
  })

  test('creates a wiki page whose title survives a reload', async ({
    page,
    account,
  }) => {
    const title = `Página ${uniqueSuffix()}`

    await page.goto(`/${account.workspaceSlug}/wiki`)
    await expect(
      page.getByText('Selecione ou crie uma página para começar.'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Nova Página' }).click()
    const wikiPrefix = `/${account.workspaceSlug}/wiki/`
    await expect(page).toHaveURL(
      ({ pathname }) =>
        pathname.startsWith(wikiPrefix) &&
        /^[a-z0-9]+$/.test(pathname.slice(wikiPrefix.length)),
    )

    const titleInput = page.getByPlaceholder('Sem título')
    await titleInput.fill(title)
    const [patch] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/wiki/') && r.request().method() === 'PATCH',
      ),
      titleInput.blur(),
    ])
    expect(patch.status()).toBe(200)

    await page.reload()
    await expect(page.getByPlaceholder('Sem título')).toHaveValue(title)
    // And the sidebar tree lists it.
    await expect(page.getByRole('complementary').getByText(title)).toBeVisible()
  })
})
