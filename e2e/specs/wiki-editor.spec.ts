import type { APIRequestContext, Page } from '@playwright/test'
import { db } from '../fixtures/db'
import { expect, test, uniqueSuffix } from '../fixtures/test'

// The wiki body is a Plate editor bound to a Yjs document on the realtime
// server (Hocuspocus, booted by playwright.config.ts next to the app). It only
// takes input once the first sync lands, so every spec waits for that before
// touching it.

async function openNewWikiPage(
  page: Page,
  api: APIRequestContext,
  workspaceId: string,
  workspaceSlug: string,
): Promise<string> {
  const created = await api.post(`/api/workspaces/${workspaceId}/wiki`, {
    data: { title: `Página ${uniqueSuffix()}` },
  })
  expect(created.status()).toBe(201)
  const id = (await created.json()).data.id as string

  await page.goto(`/${workspaceSlug}/wiki/${id}`)
  await waitForSync(page)
  return id
}

async function waitForSync(page: Page) {
  // The editable area remounts on sync; the attribute is on the new tree.
  await expect(page.locator('[data-sync-state="synced"]')).toBeVisible()
}

function editorBody(page: Page) {
  return page.locator('[data-sync-state="synced"] [data-slate-editor="true"]')
}

test.describe('wiki editor', () => {
  test('text typed into the body survives a reload', async ({
    page,
    api,
    account,
  }) => {
    const text = `Conteúdo ${uniqueSuffix()}`
    const id = await openNewWikiPage(
      page,
      api,
      account.workspaceId,
      account.workspaceSlug,
    )

    const body = editorBody(page)
    await body.click()
    // The flat JSON snapshot is autosaved after a debounce; wait for the
    // request that carries the text instead of for a fixed delay.
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith(`/wiki/${id}`) &&
          r.request().method() === 'PATCH' &&
          (r.request().postData() ?? '').includes(text),
      ),
      page.keyboard.type(text),
    ])

    // The Yjs state is what the editor loads from: Hocuspocus stores it on
    // its own debounce, so poll the row until the text is in it.
    await expect
      .poll(async () => {
        const row = await db.wikiPage.findUnique({
          where: { id },
          select: { yjsState: true },
        })
        return Buffer.from(row?.yjsState ?? []).includes(text)
      })
      .toBe(true)

    await page.reload()
    await waitForSync(page)
    await expect(editorBody(page)).toContainText(text)
  })

  test('an excalidraw block renders with self-hosted fonts', async ({
    page,
    api,
    account,
  }) => {
    const cspViolations: string[] = []
    page.on('console', (message) => {
      if (/Content Security Policy/i.test(message.text())) {
        cspViolations.push(message.text())
      }
    })
    const fontRequests: string[] = []
    page.on('request', (request) => {
      if (
        request.resourceType() === 'font' ||
        /\.woff2?$/.test(request.url())
      ) {
        fontRequests.push(request.url())
      }
    })

    await openNewWikiPage(page, api, account.workspaceId, account.workspaceSlug)

    // Excalidraw loads its hand-drawn font (Excalifont) once text uses it;
    // listen before anything can trigger it, then wait on that response.
    const excalifont = page.waitForResponse((r) =>
      /\/fonts\/Excalifont\/.+\.woff2$/.test(r.url()),
    )

    await editorBody(page).click()
    await page.keyboard.type('/excalidraw')
    await page.getByRole('option', { name: 'Excalidraw' }).click()

    const canvas = page.locator('.excalidraw canvas.interactive')
    await expect(canvas).toBeVisible()

    // Leave the slash-menu focus, then write on the canvas.
    await page.keyboard.press('Escape')
    await canvas.dblclick()
    await page.keyboard.type('Oi')
    const font = await excalifont
    expect(font.status()).toBe(200)
    expect(new URL(font.url()).origin).toBe(new URL(page.url()).origin)
    await expect(page.locator('.excalidraw textarea')).toHaveValue('Oi')

    // Chromium vets every source of a FontFace against the CSP up front, so a
    // CDN fallback left in excalidraw's font sources shows up here (and as a
    // console violation) even when the self-hosted copy is the one used.
    // See lib/excalidraw/cdn-fallback-loader.cjs.
    const origin = new URL(page.url()).origin
    const foreign = fontRequests.filter((url) => !url.startsWith(origin))
    expect(foreign, foreign.join('\n')).toEqual([])
    expect(cspViolations, cspViolations.slice(0, 3).join('\n')).toEqual([])
  })
})
