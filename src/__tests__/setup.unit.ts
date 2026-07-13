import { afterEach, vi } from 'vitest'

// Shared across every unit test: nothing under this project should hit the
// real Axiom transport. Individual tests can still assert on calls via
// `vi.mocked(logger).info` etc. without redeclaring this mock themselves.
vi.mock('@/lib/axiom/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
