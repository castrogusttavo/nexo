import { type Span, trace } from '@opentelemetry/api'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { withTraceContext } from '@/lib/otel/trace-context'

const spanWith = (traceId: string, spanId: string) =>
  ({ spanContext: () => ({ traceId, spanId, traceFlags: 1 }) }) as Span

afterEach(() => vi.restoreAllMocks())

describe('withTraceContext', () => {
  it('adds the trace and span ids of the active span', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(
      spanWith('0af7651916cd43dd8448eb211c80319c', 'b7ad6b7169203331'),
    )
    expect(withTraceContext({ message: 'hi' })).toEqual({
      message: 'hi',
      trace_id: '0af7651916cd43dd8448eb211c80319c',
      span_id: 'b7ad6b7169203331',
    })
  })

  it('leaves the event alone outside a span', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined)
    const event = { message: 'hi' }
    expect(withTraceContext(event)).toBe(event)
  })

  it('ignores an invalid (all-zero) span context', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(
      spanWith('0'.repeat(32), '0'.repeat(16)),
    )
    const event = { message: 'hi' }
    expect(withTraceContext(event)).toBe(event)
  })
})
