import {
  expect,
  profileMenuTrigger,
  signedOutTest as test,
} from '../fixtures/test'

// Sign-in, sign-out and a wrong-password attempt, against the worker account.

test.describe('sign-in', () => {
  test('rejects a wrong password and keeps the user on the form', async ({
    page,
    account,
  }) => {
    await page.goto('/sign-in')
    await page.getByLabel('E-mail').fill(account.email)
    await page.getByLabel('Senha').fill('definitely-not-the-password')
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()

    // The form keeps the user in place and surfaces the credential error.
    // It currently renders better-auth's own English message
    // ("Invalid email or password") rather than the pt-BR fallback the form
    // carries — the regex accepts either so the spec survives that fix.
    await expect(
      page.getByText(/Invalid email or password|E-mail ou senha inválidos/),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test('signs in and then signs out', async ({ page, account }) => {
    await page.goto('/sign-in')
    await page.getByLabel('E-mail').fill(account.email)
    await page.getByLabel('Senha').fill(account.password)
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()

    await expect(page).toHaveURL(new RegExp(`/${account.workspaceSlug}$`))
    await expect(page.getByRole('link', { name: 'Wiki' }).first()).toBeVisible()

    await profileMenuTrigger(page, account).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()

    await expect(page).toHaveURL(/\/sign-in$/)

    // The session is really gone: a protected page bounces back to sign-in.
    await page.goto(`/${account.workspaceSlug}`)
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
