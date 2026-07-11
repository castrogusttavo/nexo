'use server'

import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { SaveRoleSchema } from '@/src/schemas/user.schema'
import { UserService } from '@/src/services/user.service'

export type RoleSetupState = { ok: boolean; error?: string }

export async function saveRoleSetup(
  _prev: RoleSetupState,
  formData: FormData,
): Promise<RoleSetupState> {
  const auth = await getAuthSession()
  if (!auth.ok)
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' }

  const intent = formData.get('intent')

  if (intent === 'skip') {
    const skipped = await UserService.completeOnboardingStep(
      auth.value.user.id,
      'ROLE',
    )
    if (!skipped.ok) {
      return {
        ok: false,
        error: 'Não foi possível continuar. Tente novamente.',
      }
    }

    redirect('/onboarding')
  }

  const parsed = SaveRoleSchema.safeParse({ role: formData.get('role') })
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Selecione uma opção',
    }

  const result = await UserService.saveOnboardingRole(
    auth.value.user.id,
    parsed.data,
  )
  if (!result.ok)
    return { ok: false, error: 'Não foi possível salvar. Tente novamente.' }

  redirect('/onboarding')
}
