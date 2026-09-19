import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  useWikiEditorContext,
  WikiEditorProvider,
} from '../use-wiki-editor-context'

const CONTEXT = {
  workspaceId: 'ws-1',
  wikiPageId: 'page-1',
  userId: 'user-1',
  userName: 'Ana',
}

describe('useWikiEditorContext', () => {
  it('exposes the values given to the provider', () => {
    const { result } = renderHook(() => useWikiEditorContext(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <WikiEditorProvider {...CONTEXT}>{children}</WikiEditorProvider>
      ),
    })

    expect(result.current).toEqual(CONTEXT)
  })

  it('keeps the same value object across re-renders with unchanged props', () => {
    const { result, rerender } = renderHook(() => useWikiEditorContext(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <WikiEditorProvider {...CONTEXT}>{children}</WikiEditorProvider>
      ),
    })
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })

  it('reflects prop changes on the provider', () => {
    // The wrapper reads this on every render, so a rerender picks it up.
    let wikiPageId = 'page-1'
    const { result, rerender } = renderHook(() => useWikiEditorContext(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <WikiEditorProvider {...CONTEXT} wikiPageId={wikiPageId}>
          {children}
        </WikiEditorProvider>
      ),
    })
    expect(result.current.wikiPageId).toBe('page-1')

    wikiPageId = 'page-2'
    rerender()

    expect(result.current.wikiPageId).toBe('page-2')
  })

  it('throws when used outside the provider', () => {
    // React logs the uncaught render error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useWikiEditorContext())).toThrow(
      'useWikiEditorContext deve ser usado dentro de WikiEditorProvider',
    )
  })
})
