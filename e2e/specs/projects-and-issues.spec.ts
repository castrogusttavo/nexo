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

  test('drags an issue card to another column and persists the move', async ({
    page,
    account,
    api,
  }) => {
    const suffix = uniqueSuffix()
    const slug = `arrasta-${suffix}`
    const title = `Arrastar ${suffix}`

    const created = await api.post(
      `/api/workspaces/${account.workspaceId}/projects`,
      { data: { name: `Arrasta ${suffix}`, slug } },
    )
    expect(created.ok()).toBe(true)
    const project = (await created.json()).data

    // An issue needs a state, and the project's default set is created with
    // it, so read Backlog back instead of hardcoding an id.
    const states = await api.get(
      `/api/workspaces/${account.workspaceId}/projects/${slug}/states`,
    )
    expect(states.ok()).toBe(true)
    const backlog = (await states.json()).data.find(
      (state: { name: string }) => state.name === 'Backlog',
    )
    expect(backlog, 'project has no Backlog state').toBeTruthy()

    const issue = await api.post(
      `/api/workspaces/${account.workspaceId}/projects/${slug}/issues`,
      { data: { title, description: [], stateId: backlog.id } },
    )
    expect(issue.ok(), await issue.text()).toBe(true)

    await page.goto(
      `/${account.workspaceSlug}/projects/${slug}/issues?layout=kanban`,
    )

    const card = page
      .locator('[data-slot="kanban-item"]')
      .filter({ hasText: title })
    await expect(card).toBeVisible()

    const target = page
      .locator('[data-slot="kanban-column"]')
      .filter({ has: page.getByRole('heading', { name: 'Em progresso' }) })

    const from = await card.boundingBox()
    const to = await target.boundingBox()
    if (!from || !to) throw new Error('card or column has no box')

    // dnd-kit only starts a drag past its activation distance, which is also
    // what keeps a plain click opening the issue, so the pointer moves in
    // steps rather than jumping.
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      from.x + from.width / 2,
      from.y + from.height / 2 + 20,
    )
    const [patch] = await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/issues\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH',
      ),
      (async () => {
        await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 12 })
        await page.mouse.up()
      })(),
    ])
    expect(patch.status()).toBe(200)

    // Survives a reload: the move reached the server, not just the board.
    await page.reload()
    await expect(target.getByRole('button', { name: title })).toBeVisible()
    expect(project.slug).toBe(slug)
  })
})
