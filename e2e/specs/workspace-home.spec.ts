import { expect, test } from '../fixtures/test'

test.describe('workspace home', () => {
  test('lands on the workspace and shows its shell', async ({
    page,
    account,
  }) => {
    await page.goto('/')
    // The root bounces a signed-in member into their first workspace.
    await expect(page).toHaveURL(new RegExp(`/${account.workspaceSlug}$`))

    await expect(page.getByText('Links rápidos')).toBeVisible()
    await expect(page.getByText('Suas anotações')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Notas adesivas' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ajustes' })).toBeVisible()
  })

  // BUG: the home greeting is hardcoded — app/(private)/[workspace-slug]/
  // (home)/page.tsx renders `{getGreeting()}, Gusttavo Castro`, so every
  // account in every workspace is greeted with the author's name. jsdom
  // component tests never rendered this Server Component, so nothing caught
  // it. Un-fixme once the greeting uses the session user.
  test.fixme('greets the signed-in user by name', async ({ page, account }) => {
    await page.goto(`/${account.workspaceSlug}`)
    await expect(
      page.getByRole('heading', {
        name: new RegExp(`(Bom dia|Boa tarde|Boa noite), ${account.name}`),
      }),
    ).toBeVisible()
  })
})
