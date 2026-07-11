'use server'

import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { SaveGoalsSchema } from '@/src/schemas/user.schema'
import { UserService } from '@/src/services/user.service'

export type GoalsSetupState = { ok: boolean; error?: string }

export async function saveGoalsSetup(
  _prev: GoalsSetupState,
  formData: FormData,
): Promise<GoalsSetupState> {
  const auth = await getAuthSession()
  if (!auth.ok)
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' }

  const intent = formData.get('intent')

  if (intent === 'skip') {
    const skipped = await UserService.completeOnboardingStep(
      auth.value.user.id,
      'BRINGS',
    )
    if (!skipped.ok) {
      return {
        ok: false,
        error: 'Não foi possível continuar. Tente novamente.',
      }
    }

    redirect('/onboarding')
  }

  const rawGoals = formData.getAll('goals') as string[]
  const parsed = SaveGoalsSchema.safeParse({ goals: rawGoals })
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Selecione ao menos uma opção',
    }

  const result = await UserService.saveOnboardingGoals(
    auth.value.user.id,
    parsed.data,
  )
  if (!result.ok)
    return { ok: false, error: 'Não foi possível salvar. Tente novamente' }

  redirect('/onboarding')
}
