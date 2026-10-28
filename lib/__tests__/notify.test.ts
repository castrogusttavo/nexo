import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toastPromise } = vi.hoisted(() => ({ toastPromise: vi.fn() }))
vi.mock('sonner', () => ({ toast: { promise: toastPromise } }))

import { notify } from '../notify'

const MESSAGES = {
  loading: 'Salvando...',
  success: 'Salvo',
  error: 'Erro ao salvar',
}

beforeEach(() => {
  toastPromise.mockReset()
})

describe('notify.mutate', () => {
  it('tracks the promise in one toast and hands it back', async () => {
    const promise = Promise.resolve(42)

    const returned = notify.mutate(promise, MESSAGES)

    await expect(returned).resolves.toBe(42)
    expect(toastPromise).toHaveBeenCalledWith(
      promise,
      expect.objectContaining({ loading: 'Salvando...', success: 'Salvo' }),
    )
  })

  it('rejects like the promise it tracks', async () => {
    const promise = Promise.reject(new Error('boom'))

    await expect(notify.mutate(promise, MESSAGES)).rejects.toThrow('boom')
  })

  it('falls back to the given error message', () => {
    notify.mutate(Promise.resolve(), MESSAGES)

    const { error } = toastPromise.mock.calls[0]?.[1] ?? {}
    expect(error(new Error('raw'))).toBe('Erro ao salvar')
    expect(error('Mensagem do servidor')).toBe('Mensagem do servidor')
  })
})

describe('notify.run', () => {
  it('resolves true when the promise succeeds', async () => {
    await expect(notify.run(Promise.resolve('ok'), MESSAGES)).resolves.toBe(
      true,
    )
    expect(toastPromise).toHaveBeenCalledTimes(1)
  })

  it('resolves false instead of rejecting when it fails', async () => {
    await expect(
      notify.run(Promise.reject(new Error('boom')), MESSAGES),
    ).resolves.toBe(false)
    expect(toastPromise).toHaveBeenCalledTimes(1)
  })
})
