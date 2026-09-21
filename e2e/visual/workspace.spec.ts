import { expect, shotName, stabilise, test, VARIANTS } from './visual'

// The signed-in shell: the home screen a member lands on and the project list.
// Both are seeded by the worker-scoped `showcase` fixture, so the sidebar tree
// and the cards hold the same three projects on every run.

for (const variant of VARIANTS) {
  test.describe(variant.id, () => {
    test.use({ theme: variant.theme, viewport: variant.viewport })

    // The workspace shell: sidebar, header, quick links and the notes widget.
    test('home', async ({ page, showcase }) => {
      // FIXME(visual-flake): on a 390px viewport the header breadcrumb
      // ("Página inicial") wraps to two lines in a cramped row and lands on a
      // different layout between runs -- ~340px differing in 5 of 8 runs,
      // always in that pill, never elsewhere. Desktop is stable. Skipped
      // rather than loosened: a flaky shot in the CI gate blocks deploys and
      // teaches everyone to ignore the suite. Fix the header row, then drop
      // this line and re-record the two mobile baselines.
      test.fixme(
        variant.id.startsWith('mobile'),
        'mobile header breadcrumb wraps nondeterministically',
      )

      await page.goto(`/${showcase.workspaceSlug}`)
      await expect(page.getByText('Links rápidos')).toBeVisible()
      await expect(page.getByText('Suas anotações')).toBeVisible()
      await stabilise(page)

      // The greeting and the long date are rendered on the *server*, inside a
      // `'use cache'` boundary with cacheLife('hours'), so the page clock
      // cannot reach them. Masking them was not enough: the date's length
      // changes the block's height ("Segunda-feira, 21 de Setembro" wraps on
      // mobile where shorter days don't), so the screenshot failed on some
      // days and passed on others. Pinning the two strings makes the layout
      // deterministic and lets the shot assert the block instead of hiding it.
      //
      // A one-off DOM edit is not enough either: the server re-renders this
      // block after the shot's setup (the theme fixture's preference PATCH
      // makes ThemeSync refresh the route, and the RSC payload writes the
      // real date back), so the pin lost the race on some runs and not
      // others. A MutationObserver re-applies it whenever React touches the
      // subtree, so whatever the server sends last, the frame shows the pin.
      const greeting = page.getByRole('heading', {
        name: /(Bom dia|Boa tarde|Boa noite), Ana/,
      })
      await expect(greeting).toBeVisible()

      const pinnedDate = 'Sexta-feira, 09 de Janeiro às 09:00'
      await page.evaluate((pinned) => {
        const apply = () => {
          for (const heading of document.querySelectorAll('h1, h2, h3, h4')) {
            if (
              !/^(Bom dia|Boa tarde|Boa noite)/.test(heading.textContent ?? '')
            )
              continue
            if (heading.textContent !== 'Bom dia, Ana')
              heading.textContent = 'Bom dia, Ana'
            const dateLine = heading.nextElementSibling
            if (dateLine && dateLine.textContent !== pinned)
              dateLine.textContent = pinned
          }
        }
        apply()
        new MutationObserver(apply).observe(document.body, {
          subtree: true,
          childList: true,
          characterData: true,
        })
      }, pinnedDate)
      await expect(page.getByText(pinnedDate)).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('workspace', 'home', variant.id),
        { fullPage: true },
      )
    })

    // Three project cards with fixed names, descriptions and a single member
    // avatar each.
    test('project-list', async ({ page, showcase }) => {
      await page.goto(`/${showcase.workspaceSlug}/projects`)
      await expect(page.getByText('Plataforma').first()).toBeVisible()
      await expect(page.getByText('Design System').first()).toBeVisible()
      await stabilise(page)

      await expect(page).toHaveScreenshot(
        shotName('workspace', 'project-list', variant.id),
        { fullPage: true },
      )
    })
  })
}
