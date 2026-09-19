import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no matchMedia; theme and responsive hooks call it on mount.
// Default to "no media query matches" — tests override per case.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Node 25+ ships its own `localStorage` global, which shadows jsdom's and is
// undefined unless Node runs with --localstorage-file. Give every test a
// fresh in-memory Storage so storage-backed hooks work on any Node version.
class MemoryStorage implements Storage {
  #items = new Map<string, string>()
  get length() {
    return this.#items.size
  }
  clear() {
    this.#items.clear()
  }
  getItem(key: string) {
    return this.#items.get(key) ?? null
  }
  key(index: number) {
    return [...this.#items.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.#items.delete(key)
  }
  setItem(key: string, value: string) {
    this.#items.set(key, String(value))
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  })
}

// Browser APIs jsdom lacks, needed by cmdk (ResizeObserver, scrollIntoView)
// and input-otp (elementFromPoint). Defined only when missing so a test can
// still install its own spy.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= () => {}
document.elementFromPoint ??= () => null

// Unmount any rendered tree and reset mocks between component tests so a
// previous render's DOM never leaks into the next assertion.
afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
