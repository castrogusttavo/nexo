import { describe, expect, it } from 'vitest'
import {
  axiomSpanProcessors,
  serverTracingOptions,
} from '@/lib/otel/axiom-traces'

const configured = { token: 'xaat-test', dataset: 'nexo-traces', sampleRate: 0.9 }

describe('axiomSpanProcessors', () => {
  it('is empty without a token, so nothing is exported', () => {
    expect(axiomSpanProcessors({ ...configured, token: undefined })).toEqual([])
  })

  it('builds one batch processor with a token', () => {
    expect(axiomSpanProcessors(configured)).toHaveLength(1)
  })
})

describe('serverTracingOptions', () => {
  it('adds nothing without a token, leaving Sentry on its own defaults', () => {
    expect(serverTracingOptions({ ...configured, token: undefined })).toEqual({})
  })

  it('samples at the configured rate and keeps transactions out of Sentry', () => {
    const options = serverTracingOptions(configured) as {
      tracesSampleRate: number
      openTelemetrySpanProcessors: unknown[]
      beforeSendTransaction: () => null
    }
    expect(options.tracesSampleRate).toBe(0.9)
    expect(options.openTelemetrySpanProcessors).toHaveLength(1)
    expect(options.beforeSendTransaction()).toBeNull()
  })
})
