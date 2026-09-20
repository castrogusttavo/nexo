import { expect, test, uniqueSuffix } from '../fixtures/test'

// Create a project, open it, create an issue, move it between board columns
// and see it in both layouts. Everything is named with a per-run suffix, so
// re-runs never collide (the Playwright run gets no table truncation).

test.describe('projects and issues', () => {
  test('creates a project from the dialog and opens it', async ({
    page,
    account,
  }) => {
    const suffix = uniqueSuffix()
    const name = `Projeto ${suffix}`
    const slug = `projeto-${suffix}`

    await page.goto(`/${account.workspaceSlug}/projects`)
    await page.getByRole('button', { name: 'Adicionar projeto' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: 'Nome do projeto' }).fill(name)
    // The ID field mirrors the name through the modal's own slugify.
    await expect(
      dialog.getByRole('textbox', { name: 'ID do projeto' }),
    ).toHaveValue(slug)
    await dialog
      .getByRole('textbox', { name: 'Descrição' })
      .fill('Criado pelo Playwright')
    await dialog.getByRole('button', { name: 'Criar projeto' }).click()

    await expect(page.getByText('Projeto criado')).toBeVisible()
    await expect(dialog).toBeHidden()

    // The new project shows up in the list and in the sidebar tree.
    await expect(page.getByText(name).first()).toBeVisible()
    await page.goto(`/${account.workspaceSlug}/projects/${slug}/settings`)
    await expect(
      page.getByRole('textbox', { name: 'Nome do projeto' }),
    ).toHaveValue(name)
  })

  test('creates an issue, moves it to another state and sees it on the board', async ({
    page,
    account,
    api,
  }) => {
    const suffix = uniqueSuffix()
    const slug = `fluxo-${suffix}`
    const title = `Issue ${suffix}`

    const created = await api.post(
      `/api/workspaces/${account.workspaceId}/projects`,
      { data: { name: `Fluxo ${suffix}`, slug } },
    )
    expect(created.ok()).toBe(true)

    await page.goto(
      `/${account.workspaceSlug}/projects/${slug}/issues?layout=list`,
    )

    // Inline creation inside the Backlog section: Enter submits, blur cancels.
    const backlog = page.getByRole('region', { name: /^Backlog/ })
    await backlog.getByRole('button', { name: 'Nova issue' }).click()
    const titleInput = page.getByPlaceholder('Nome da issue')
    await titleInput.fill(title)
    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/projects/${slug}/issues`) &&
          r.request().method() === 'POST',
      ),
      titleInput.press('Enter'),
    ])
    expect(createResponse.status()).toBe(201)

    const issueRow = backlog.getByRole('button', { name: title })
    await expect(issueRow).toBeVisible()

    // Move it across columns through the row's state picker. The kanban's own
    // drag-and-drop is not wired up (see the fixme below), but this hits the
    // same PATCH the board would.
    // The section holds exactly this one issue, so its state picker is the
    // only "Backlog" button inside it (the section header sits outside).
    await backlog.getByRole('button', { name: 'Backlog', exact: true }).click()
    const [patch] = await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/issues\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH',
      ),
      page.getByRole('option', { name: 'Em progresso' }).click(),
    ])
    expect(patch.status()).toBe(200)

    // The board shows it under the new column.
    await page.goto(
      `/${account.workspaceSlug}/projects/${slug}/issues?layout=kanban`,
    )
    const inProgress = page
      .locator('[data-slot="kanban-column"]')
      .filter({ has: page.getByRole('heading', { name: 'Em progresso' }) })
    await expect(inProgress.getByRole('button', { name: title })).toBeVisible()

    // And under the matching section back in the list layout.
    await page.goto(
      `/${account.workspaceSlug}/projects/${slug}/issues?layout=list`,
    )
    await expect(
      page
        .getByRole('region', { name: /^Em progresso/ })
        .getByRole('button', { name: title }),
    ).toBeVisible()
  })

  // BUG: the kanban cards cannot be dragged at all. components/ui/kanban.tsx
  // attaches the dnd-kit listeners to <KanbanItemHandle>, and no screen
  // renders one — IssueKanbanView puts a plain <button> inside <KanbanItem>.
  // Verified in Chromium: a mouse drag past the 10px activation distance and
  // the KeyboardSensor pick-up (Space on the focused card) both leave
  // data-dragging="false" and fire no PATCH. Un-fixme once a handle is wired.
  test.fixme('drags an issue card to another kanban column', async ({
    page,
    account,
  }) => {
    await page.goto(
      `/${account.workspaceSlug}/projects/any/issues?layout=kanban`,
    )
    const card = page.locator('[data-slot="kanban-item"]').first()
    await card.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-dragging="true"]')).toHaveCount(1)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Space')
  })
})
