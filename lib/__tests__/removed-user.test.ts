import { describe, expect, it } from 'vitest'
import {
  displayUserName,
  NO_LEAD_NAME,
  REMOVED_USER_NAME,
} from '../removed-user'

describe('displayUserName', () => {
  it('keeps a real name', () => {
    expect(displayUserName('Ana Souza')).toBe('Ana Souza')
  })

  it('falls back when the author was deleted', () => {
    expect(displayUserName(null)).toBe(REMOVED_USER_NAME)
  })

  it('falls back when no name was passed at all', () => {
    expect(displayUserName()).toBe(REMOVED_USER_NAME)
    expect(displayUserName(undefined)).toBe(REMOVED_USER_NAME)
  })

  // A blank name is as useless to a reader as a missing one.
  it('falls back on an empty or whitespace-only name', () => {
    expect(displayUserName('')).toBe(REMOVED_USER_NAME)
    expect(displayUserName('   ')).toBe(REMOVED_USER_NAME)
  })

  it('does not trim a name it keeps', () => {
    expect(displayUserName('  Ana  ')).toBe('  Ana  ')
  })
})

describe('user-facing copy', () => {
  it('is written in pt-BR', () => {
    expect(REMOVED_USER_NAME).toBe('Usuário removido')
    expect(NO_LEAD_NAME).toBe('Sem líder')
  })
})
