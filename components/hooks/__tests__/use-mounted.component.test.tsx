import { renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useMounted } from '../use-mounted'

function Probe() {
  return <span>{useMounted() ? 'mounted' : 'not-mounted'}</span>
}

describe('useMounted', () => {
  it('is false during server rendering', () => {
    expect(renderToString(<Probe />)).toContain('not-mounted')
  })

  it('becomes true once the component has mounted', () => {
    const { result } = renderHook(() => useMounted())

    expect(result.current).toBe(true)
  })

  it('renders false first, then true after the mount effect', () => {
    const history: boolean[] = []

    renderHook(() => {
      const mounted = useMounted()
      history.push(mounted)
      return mounted
    })

    expect(history[0]).toBe(false)
    expect(history.at(-1)).toBe(true)
  })

  it('stays true across re-renders', () => {
    const { result, rerender } = renderHook(() => useMounted())

    rerender()

    expect(result.current).toBe(true)
  })
})
