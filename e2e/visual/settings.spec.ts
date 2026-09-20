import { expect, shotName, stabilise, test, VARIANTS } from './visual'

// Workspace members, plus the two project settings screens that carry real
// state. The members table renders a formatted "Entrou em" date: the
// membership row is created with a fixed `createdAt` (JOINED_AT in visual.ts)
// instead of masking the cell, so the column keeps being asserted.

for (const variant of VARIANTS) {
  test.describe(variant.id, () => {
    test.use({ theme: variant.theme, viewport: variant.viewport })

    test('workspace-members', async ({ page, showcase }) => {
      await page.goto(`/${showcase.workspaceSlug}/settings/members`)
      await expect(
        page.getByRole('heading', { name: 'Membros', level: 3 }),
      ).toBeVisible()
      await expect(page.getByRole('cell', { name: 'Dono' })).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('settings', 'workspace-members', variant.id),
        { fullPage: true },
      )
    })

    test('project-general', async ({ page, showcase }) => {
      await page.goto(
        `/${showcase.workspaceSlug}/projects/${showcase.projectSlug}/settings`,
      )
      await expect(
        page.getByRole('textbox', { name: 'Nome do projeto' }),
      ).toHaveValue('Plataforma')
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('settings', 'project-general', variant.id),
        { fullPage: true },
      )
    })

    test('project-estimates', async ({ page, showcase }) => {
      await page.goto(
        `/${showcase.workspaceSlug}/projects/${showcase.projectSlug}/settings/estimates`,
      )
      await expect(
        page.getByRole('heading', { name: 'Estimativas', level: 3 }),
      ).toBeVisible()
      await expect(
        page.getByText('1, 2, 3, 5, 8, 13, 21, 34, 55'),
      ).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('settings', 'project-estimates', variant.id),
        { fullPage: true },
      )
    })
  })
}
