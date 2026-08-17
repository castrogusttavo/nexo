import { createMemoryStorage, createStorage } from 'greatstorage'

export const issueListPreferencesStorage = createStorage({
  prefix: 'nexo-issue-list-preferences',
  storage: typeof window === 'undefined' ? createMemoryStorage() : undefined
})
