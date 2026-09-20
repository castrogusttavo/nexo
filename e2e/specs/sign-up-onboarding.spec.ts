import { expect } from '@playwright/test'
import { db, dropAccount, waitForEmailOtp } from '../fixtures/db'
import { TEST_PASSWORD, anonTest as test, uniqueSuffix } from '../fixtures/test'

// Sign-up → e-mail verification → onboarding → landing in the workspace.
// The OTP e-mail is never delivered under MAIL_DRY_RUN, so the code is read
// back from the verification row better-auth wrote — everything else is done
// the way a user does it, in the browser.

test.describe('sign-up and onboarding', () => {
  test('signs up, verifies the e-mail, completes onboarding and lands in the workspace', async ({
    page,
  }) => {
    const suffix = uniqueSuffix()
    const email = `pw-signup-${suffix}@example.com`
    const workspaceName = `Onboarding ${suffix}`
    const workspaceSlug = `onb-${suffix}`

    await page.goto('/sign-up')
    await expect(
      page.getByRole('heading', { name: 'Crie sua conta do Nexo.' }),
    ).toBeVisible()

    await page.getByLabel('Nome').fill(`PW Signup ${suffix}`)
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(TEST_PASSWORD)
    await page
      .getByRole('checkbox', { name: 'Li e aceito os Termos de Serviço' })
      .click()
    await page
      .getByRole('checkbox', { name: 'Li e aceito a Política de Privacidade' })
      .click()

    await page.getByRole('button', { name: 'Criar conta' }).click()

    // Step 2 of the same route: the 6-digit code screen.
    await expect(page.getByText('Confirme seu e-mail')).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()

    const otp = await waitForEmailOtp(email)

    // The component auto-submits as soon as the 6th digit lands.
    await page
      .getByRole('textbox', { name: 'Código de verificação de 6 dígitos' })
      .fill(otp)

    // Verified + auto-signed-in, so `/` bounces to onboarding, which bounces
    // to the first unfinished step.
    await expect(page).toHaveURL(/\/onboarding\/profile-setup$/)
    await expect(
      page.getByRole('heading', { name: 'Crie seu perfil', level: 1 }),
    ).toBeVisible()

    await page.getByLabel(/^Nome/).fill(`PW Signup ${suffix}`)
    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page).toHaveURL(/\/onboarding\/role-setup$/)
    await expect(
      page.getByRole('heading', { name: 'Qual é a sua função?', level: 1 }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Developer', exact: true }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page).toHaveURL(/\/onboarding\/goals-setup$/)
    await expect(
      page.getByRole('heading', { name: 'O que te traz ao Nexo?', level: 1 }),
    ).toBeVisible()
    await page
      .getByRole('checkbox', { name: 'Gerenciar sprints de engenharia' })
      .click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page).toHaveURL(/\/onboarding\/workspace-setup$/)
    await expect(
      page.getByRole('heading', { name: 'Crie seu workspace', level: 1 }),
    ).toBeVisible()
    await page.getByLabel(/^Nome do seu workspace/).fill(workspaceName)
    await page.getByLabel(/^Defina o URL do seu workspace/).fill(workspaceSlug)
    await page.getByRole('button', { name: 'Apenas eu' }).click()
    await page.getByRole('button', { name: 'Criar workspace' }).click()

    await expect(page).toHaveURL(new RegExp(`/${workspaceSlug}$`))

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerified: true,
        onboardingStep: true,
        role: true,
      },
    })
    expect(user?.emailVerified).toBe(true)
    expect(user?.onboardingStep).toBeNull()
    expect(user?.role).toBe('DEVELOPER')

    // This account is created by the UI, not by the worker fixture, so it
    // cleans up after itself.
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    })
    await dropAccount(user?.id ?? '', workspace?.id ?? '')
  })

  // BUG: the "Fundador / Executivo" option submits FOUNDER_EXECUTIBE
  // (app/onboarding/role-setup/role-form.tsx) while UserRoleValues spells it
  // FOUNDER_EXECUTIVE, so the step cannot be completed with that role: the
  // page stays put and shows the raw Zod message
  // `Invalid option: expected one of "PRODUCT_MANAGER"|…` — English, in a
  // pt-BR screen. Reproduced in Chromium; un-fixme once the value is fixed.
  test.fixme('accepts the "Fundador / Executivo" role', async ({ page }) => {
    await page.goto('/onboarding/role-setup')
    await page.getByRole('button', { name: 'Fundador / Executivo' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page).toHaveURL(/\/onboarding\/goals-setup$/)
  })

  test('refuses a sign-up without the consent checkboxes', async ({ page }) => {
    const suffix = uniqueSuffix()

    await page.goto('/sign-up')
    await page.getByLabel('Nome').fill(`PW NoConsent ${suffix}`)
    await page.getByLabel('E-mail').fill(`pw-noconsent-${suffix}@example.com`)
    await page.getByLabel('Senha').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(
      page.getByText(
        'Você precisa aceitar os Termos de Serviço e a Política de Privacidade',
      ),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/sign-up$/)
  })
})
