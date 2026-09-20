import { expect, shotName, stabilise, test, VARIANTS } from './visual'

// The two layouts of the same five issues: the grouped list and the board.
// `layout` is a URL parameter, so each picture is one navigation rather than a
// click and a transition.

for (const variant of VARIANTS) {
  test.describe(variant.id, () => {
    test.use({ theme: variant.theme, viewport: variant.viewport })

    test('list-view', async ({ page, showcase }) => {
      await page.goto(
        `/${showcase.workspaceSlug}/projects/${showcase.projectSlug}/issues?layout=list`,
      )
      await expect(
        page.getByRole('button', { name: 'Migrar o pipeline de importação' }),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Publicar a página de status' }),
      ).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('issues', 'list-view', variant.id),
        { fullPage: true },
      )
    })

    test('kanban-board', async ({ page, showcase }) => {
      await page.goto(
        `/${showcase.workspaceSlug}/projects/${showcase.projectSlug}/issues?layout=kanban`,
      )
      const columns = page.locator('[data-slot="kanban-column"]')
      await expect(columns.first()).toBeVisible()
      await expect(
        page
          .locator('[data-slot="kanban-item"]')
          .filter({ hasText: 'Reescrever o seletor de estimativas' }),
      ).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('issues', 'kanban-board', variant.id),
        { fullPage: true },
      )
    })
  })
}
