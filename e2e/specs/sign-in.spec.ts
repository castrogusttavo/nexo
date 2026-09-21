import {
  atPath,
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

    // The form keeps the user in place and surfaces the credential error in
    // pt-BR: Better Auth's own English message must never reach the page.
    await expect(
      page.getByText('E-mail ou senha inválidos', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText(/Invalid email or password/i)).toHaveCount(0)
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test('signs in and then signs out', async ({ page, account }) => {
    await page.goto('/sign-in')
    await page.getByLabel('E-mail').fill(account.email)
    await page.getByLabel('Senha').fill(account.password)
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()

    await expect(page).toHaveURL(atPath(`/${account.workspaceSlug}`))
    await expect(page.getByRole('link', { name: 'Wiki' }).first()).toBeVisible()

    await profileMenuTrigger(page, account).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()

    await expect(page).toHaveURL(/\/sign-in$/)

    // The session is really gone: a protected page bounces back to sign-in.
    await page.goto(`/${account.workspaceSlug}`)
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
