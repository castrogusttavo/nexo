import { expect, test, uniqueSuffix } from '../fixtures/test'

// The workspace/project settings screens that carry real state: the members
// table, renaming a project, and the estimates system.

test.describe('settings', () => {
  test('members page lists the workspace owner', async ({ page, account }) => {
    await page.goto(`/${account.workspaceSlug}/settings/members`)

    await expect(
      page.getByRole('heading', { name: 'Membros', level: 3 }),
    ).toBeVisible()
    await expect(
      page.getByText('Gerencie o acesso a este workspace.'),
    ).toBeVisible()

    const ownerRow = page.getByRole('row', { name: new RegExp(account.email) })
    await expect(ownerRow).toBeVisible()
    await expect(ownerRow.getByRole('cell', { name: 'Dono' })).toBeVisible()
    await expect(ownerRow.getByRole('cell', { name: 'Ativo' })).toBeVisible()

    // The invite dialog opens with its own fields.
    await page.getByRole('button', { name: 'Adicionar membro' }).click()
    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByRole('heading', { name: 'Convidar membro' }),
    ).toBeVisible()
    await expect(dialog.getByPlaceholder('email@exemplo.com')).toBeVisible()
  })

  test('renames a project and keeps the new name after a reload', async ({
    page,
    account,
    api,
  }) => {
    const suffix = uniqueSuffix()
    const slug = `rename-${suffix}`
    await api.post(`/api/workspaces/${account.workspaceId}/projects`, {
      data: { name: `Antes ${suffix}`, slug },
    })

    await page.goto(`/${account.workspaceSlug}/projects/${slug}/settings`)
    const nameField = page.getByRole('textbox', { name: 'Nome do projeto' })
    await expect(nameField).toHaveValue(`Antes ${suffix}`)

    await nameField.fill(`Depois ${suffix}`)
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/projects/${slug}`) &&
          r.request().method() === 'PATCH',
      ),
      page.getByRole('button', { name: 'Atualizar projeto' }).click(),
    ])
    expect(response.status()).toBe(200)
    await expect(page.getByText('Projeto atualizado')).toBeVisible()

    await page.reload()
    await expect(
      page.getByRole('textbox', { name: 'Nome do projeto' }),
    ).toHaveValue(`Depois ${suffix}`)
  })

  test('shows the estimate system and switches it in one commit', async ({
    page,
    account,
    api,
  }) => {
    const suffix = uniqueSuffix()
    const slug = `estim-${suffix}`
    await api.post(`/api/workspaces/${account.workspaceId}/projects`, {
      data: { name: `Estim ${suffix}`, slug },
    })

    await page.goto(
      `/${account.workspaceSlug}/projects/${slug}/settings/estimates`,
    )
    await expect(
      page.getByRole('heading', { name: 'Estimativas', level: 3 }),
    ).toBeVisible()
    await expect(page.getByText('Pontos')).toBeVisible()
    await expect(page.getByText('1, 2, 3, 5, 8, 13, 21, 34, 55')).toBeVisible()

    // The enable toggle round-trips through the API.
    const toggle = page.getByRole('switch')
    await expect(toggle).toBeChecked()
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/projects/${slug}`) &&
          r.request().method() === 'PATCH',
      ),
      toggle.click(),
    ])
    await expect(page.getByText('Estimativas atualizadas')).toBeVisible()
    await expect(toggle).not.toBeChecked()

    // Switching systems: the PATCH on /estimate is the commit point, so the
    // card must never show a system with the other system's values.
    const section = page
      .locator('div')
      .filter({
        has: page.getByRole('heading', { name: 'Estimativa', exact: true }),
      })
      .last()
    await section.getByRole('button').click()

    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByRole('heading', { name: 'Editar sistema de estimativas' }),
    ).toBeVisible()
    await dialog
      .getByRole('button', { name: /^Alterar tipo de estimativa/ })
      .click()
    await dialog.getByRole('tab', { name: 'Categorias' }).click()
    await dialog.getByRole('button', { name: /^Tamanhos \(T-shirt\)/ }).click()
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(
      page.getByText('Sistema de estimativa atualizado'),
    ).toBeVisible()
    // The success toast fires at the commit PATCH, while the old values are
    // still being deleted one by one; the dialog only closes once that loop
    // is done. Reloading before it would abort the cleanup mid-way and leave
    // the project holding both systems' values.
    await expect(dialog).toBeHidden()

    // Re-read the screen from the server: the switch must have landed as one
    // system with one set of values, never a mix of both.
    await page.reload()
    await expect(section).toContainText('Categorias (Tamanhos (T-shirt))')
    await expect(section).toContainText('XS, S, M, L, XL, XXL')
    await expect(section).not.toContainText('13, 21, 34, 55')
  })
})
