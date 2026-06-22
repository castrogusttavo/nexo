'use server'

import { redirect } from 'next/navigation'
import { UserCache } from '@/src/cache/user.cache'
import { getAuthSession } from '@/src/lib/auth-session'
import { prisma } from '@/src/lib/prisma'
import { CreateWorkspaceSchema } from '@/src/schemas/workspace.schema'
import { WorkspaceService } from '@/src/services/workspace.service'

export type WorkspaceSetupState = { ok: boolean; error?: string }

export async function createOnboardingWorkspace(
  _prev: WorkspaceSetupState,
  formData: FormData,
): Promise<WorkspaceSetupState> {
  const auth = await getAuthSession()
  if (!auth.ok)
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' }

  const parsed = CreateWorkspaceSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  })
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    }

  const userId = auth.value.user.id

  const result = await WorkspaceService.create(userId, parsed.data)
  if (!result.ok) {
    const msg =
      result.error.code === 'CONFLICT'
        ? 'Esta URL já está em uso. Escolha outra.'
        : 'Não foi possível criar o workspace. Tente novamente'
    return { ok: false, error: msg }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingStep: null },
  })
  await UserCache.invalidate(userId)

  redirect(`/${result.value.slug}`)
}
