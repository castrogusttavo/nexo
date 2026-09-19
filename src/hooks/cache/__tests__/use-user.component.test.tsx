import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCacheUser } from '../use-user'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

describe('useCacheUser', () => {
  it('returns the Better Auth session as-is', () => {
    const session = {
      data: { user: { id: 'user-1', name: 'Ana' } },
      isPending: false,
      error: null,
    }
    useSession.mockReturnValue(session)

    const { result } = renderHook(() => useCacheUser())

    expect(result.current).toBe(session)
    expect(useSession).toHaveBeenCalled()
  })

  it('reflects a signed-out session', () => {
    useSession.mockReturnValue({ data: null, isPending: false, error: null })

    const { result } = renderHook(() => useCacheUser())

    expect(result.current.data).toBeNull()
  })
})
