'use server'

import { redirect } from 'next/navigation'
import z from 'zod'
import { UserCache } from '@/src/cache/user.cache'
import { getAuthSession } from '@/src/lib/auth-session'
import { prisma } from '@/src/lib/prisma'

const ProfileSetupSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 100 caracteres'),
})

export type ProfileSetupState = { ok: boolean; error?: string }

export async function saveProfileSetup(
  _prev: ProfileSetupState,
  formData: FormData,
): Promise<ProfileSetupState> {
  const auth = await getAuthSession()
  if (!auth.ok) return _prev

  const parsed = ProfileSetupSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Nome inválido',
    }

  const userId = auth.value.user.id

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, onboardingStep: 'ROLE' },
  })

  await UserCache.invalidate(userId)

  redirect('/onboarding')
}
