import { describe, expect, it } from 'vitest'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { toUserDTO } from '@/src/mappers/user.mapper'

describe('toUserDTO()', () => {
  it('should map all fields correctly', () => {
    const user = createFakeUser({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      emailVerified: true,
      image: 'https://example.com/avatar.png',
      role: 'ADMIN',
      workspaceId: 'ws-1',
    })

    const dto = toUserDTO(user)

    expect(dto).toEqual({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      emailVerified: true,
      image: 'https://example.com/avatar.png',
      role: 'ADMIN',
      workspaceId: 'ws-1',
      createdAt: user.createdAt.toISOString(),
    })
  })

  it('should convert createdAt Date to ISO string', () => {
    const date = new Date('2025-01-15T10:30:00.000Z')
    const user = createFakeUser({ createdAt: date })

    const dto = toUserDTO(user)

    expect(dto.createdAt).toBe('2025-01-15T10:30:00.000Z')
  })

  it('should handle null image', () => {
    const user = createFakeUser({ image: null })

    const dto = toUserDTO(user)

    expect(dto.image).toBeNull()
  })

  it('should handle null workspaceId', () => {
    const user = createFakeUser({ workspaceId: null })

    const dto = toUserDTO(user)

    expect(dto.workspaceId).toBeNull()
  })

  it('should exclude updatedAt from the output', () => {
    const user = createFakeUser()

    const dto = toUserDTO(user)

    expect(dto).not.toHaveProperty('updatedAt')
  })

  it('should exclude password-related fields', () => {
    const user = createFakeUser()

    const dto = toUserDTO(user)

    expect(dto).not.toHaveProperty('password')
  })
})
