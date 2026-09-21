import { atPath, expect, test } from '../fixtures/test'

test.describe('workspace home', () => {
  test('lands on the workspace and shows its shell', async ({
    page,
    account,
  }) => {
    await page.goto('/')
    // The root bounces a signed-in member into their first workspace.
    await expect(page).toHaveURL(atPath(`/${account.workspaceSlug}`))

    await expect(page.getByText('Links rápidos')).toBeVisible()
    await expect(page.getByText('Suas anotações')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Notas adesivas' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ajustes' })).toBeVisible()
  })

  // The greeting used to be hardcoded to the author's own name for every
  // account: a Server Component, so no jsdom test ever rendered it.
  test('greets the signed-in user by first name', async ({ page, account }) => {
    await page.goto(`/${account.workspaceSlug}`)
    const [firstName] = account.name.split(' ')
    const greeting = page.getByRole('heading', {
      name: /(Bom dia|Boa tarde|Boa noite), /,
    })
    await expect(greeting).toBeVisible()
    await expect(greeting).toContainText(`, ${firstName}`)
  })
})
