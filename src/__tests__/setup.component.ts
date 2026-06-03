import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Unmount any rendered tree and reset mocks between component tests so a
// previous render's DOM never leaks into the next assertion.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
