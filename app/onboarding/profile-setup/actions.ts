'use server'

import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { SaveProfileSchema } from '@/src/schemas/user.schema'
import { UserService } from '@/src/services/user.service'

export type ProfileSetupState = { ok: boolean; error?: string }

export async function saveProfileSetup(
  _prev: ProfileSetupState,
  formData: FormData,
): Promise<ProfileSetupState> {
  const auth = await getAuthSession()
  if (!auth.ok) return _prev

  const parsed = SaveProfileSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Nome inválido',
    }

  const result = await UserService.saveOnboardingProfile(
    auth.value.user.id,
    parsed.data,
  )
  if (!result.ok)
    return { ok: false, error: 'Não foi possível salvar. Tente novamente.' }

  redirect('/onboarding')
}
