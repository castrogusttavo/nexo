import { expect, IDENTITY, shotName, stabilise, test, VARIANTS } from './visual'

// The account modal, captured as an element rather than a page: it is an
// overlay over whatever screen happened to be underneath, and a full-page
// screenshot would repaint on every unrelated change to the workspace home.

for (const variant of VARIANTS) {
  test.describe(variant.id, () => {
    test.use({ theme: variant.theme, viewport: variant.viewport })

    // The dialog is `w-6xl min-w-6xl` (1152px), so at 390px it renders at the
    // exact same intrinsic size as on desktop and `locator.screenshot()` would
    // write a byte-identical baseline under a second name. Reviewing the same
    // picture twice is worse than not having it.
    test.skip(
      variant.id.startsWith('mobile'),
      'the account modal has a fixed 6xl width; the mobile shot would duplicate the desktop one',
    )

    for (const tab of [
      { id: 'profile', item: 'Configurações', heading: 'Perfil' },
      { id: 'preferences', item: 'Preferências', heading: 'Preferências' },
    ]) {
      test(`${tab.id}-tab`, async ({ page, showcase }) => {
        await page.goto(`/${showcase.workspaceSlug}`)

        // Opened the way a user does: the avatar button, then the menu item.
        await page
          .getByRole('button', {
            name: IDENTITY.name.charAt(0).toUpperCase(),
            exact: true,
          })
          .click()
        await page.getByRole('menuitem', { name: tab.item }).click()

        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        // The e-mail appears twice (sidebar card and tab panel); either one
        // proves the modal is holding the fixed identity.
        await expect(dialog.getByText(IDENTITY.email).first()).toBeVisible()
        await stabilise(page)

        await expect(dialog).toHaveScreenshot(
          shotName('account-modal', tab.id, variant.id),
        )
      })
    }
  })
}
