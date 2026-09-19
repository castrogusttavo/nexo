import { act, renderHook } from '@testing-library/react'
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderHookWithProviders } from '@/src/__tests__/helpers/component'
import type { BasicFilterClause } from '../filter-schema'
import { useIssueFilters } from '../use-issue-filters'

const STATE_CLAUSE: BasicFilterClause = {
  id: 'c1',
  field: 'state',
  operator: 'is',
  value: ['todo', 'doing'],
}

const DUE_CLAUSE: BasicFilterClause = {
  id: 'c2',
  field: 'due-date',
  operator: 'between',
  value: ['2026-01-01', '2026-01-31'],
}

// The shared helper does not expose `onUrlUpdate`; a local wrapper lets
// these tests assert what the hook writes back to the query string.
function renderWithUrlSpy(searchParams = '') {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        {children}
      </NuqsTestingAdapter>
    )
  }
  const rendered = renderHook(() => useIssueFilters(), { wrapper: Wrapper })
  const lastUrl = () => onUrlUpdate.mock.lastCall?.[0].searchParams
  return { ...rendered, onUrlUpdate, lastUrl }
}

describe('useIssueFilters', () => {
  describe('reading the URL', () => {
    it('falls back to basic mode with no filters and an empty query', () => {
      const { result } = renderHookWithProviders(() => useIssueFilters())

      expect(result.current[0]).toEqual({ mode: 'basic', filters: [], pql: '' })
    })

    it('parses mode, filters and pql from the query string', () => {
      const { result } = renderHookWithProviders(() => useIssueFilters(), {
        searchParams: {
          mode: 'pql',
          filters: JSON.stringify([STATE_CLAUSE, DUE_CLAUSE]),
          pql: 'priority = high',
        },
      })

      expect(result.current[0]).toEqual({
        mode: 'pql',
        filters: [STATE_CLAUSE, DUE_CLAUSE],
        pql: 'priority = high',
      })
    })

    it('ignores an unknown mode', () => {
      const { result } = renderHookWithProviders(() => useIssueFilters(), {
        searchParams: { mode: 'sql' },
      })

      expect(result.current[0].mode).toBe('basic')
    })

    it('ignores filters that are not valid JSON', () => {
      const { result } = renderHookWithProviders(() => useIssueFilters(), {
        searchParams: { filters: '[{not json' },
      })

      expect(result.current[0].filters).toEqual([])
    })

    it('ignores filters that do not match the clause schema', () => {
      const invalid = [{ ...STATE_CLAUSE, field: 'not-a-field' }]
      const { result } = renderHookWithProviders(() => useIssueFilters(), {
        searchParams: { filters: JSON.stringify(invalid) },
      })

      expect(result.current[0].filters).toEqual([])
    })
  })

  describe('writing the URL', () => {
    it('serializes filters as JSON into the query string', async () => {
      const { result, lastUrl } = renderWithUrlSpy()

      await act(() => result.current[1]({ filters: [STATE_CLAUSE] }))

      expect(result.current[0].filters).toEqual([STATE_CLAUSE])
      expect(JSON.parse(lastUrl()?.get('filters') ?? '')).toEqual([
        STATE_CLAUSE,
      ])
    })

    it('switches mode and stores the pql expression', async () => {
      const { result, lastUrl } = renderWithUrlSpy()

      await act(() => result.current[1]({ mode: 'pql', pql: 'state = done' }))

      expect(result.current[0]).toMatchObject({
        mode: 'pql',
        pql: 'state = done',
      })
      expect(lastUrl()?.get('mode')).toBe('pql')
      expect(lastUrl()?.get('pql')).toBe('state = done')
    })

    it('removes keys from the URL when cleared back to their defaults', async () => {
      const { result, lastUrl } = renderWithUrlSpy(
        `?mode=pql&pql=x&filters=${encodeURIComponent(JSON.stringify([STATE_CLAUSE]))}`,
      )

      await act(() => result.current[1](null))

      expect(result.current[0]).toEqual({ mode: 'basic', filters: [], pql: '' })
      expect(lastUrl()?.toString()).toBe('')
    })
  })
})
