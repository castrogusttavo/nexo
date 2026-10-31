import { vi } from 'vitest'
import { apiSuccess, mockFetch } from '@/src/__tests__/helpers/component'

// Answers the network the way the API does, by method and path, so the real
// hooks run. `calls` is every request made, in order.
export type Handler = (init: RequestInit | undefined, url: string) => Response

export function routeFetch(routes: Record<string, Handler>) {
  const spy = mockFetch().mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const handler = routes[`${method} ${url}`]
    if (!handler) throw new Error(`unexpected request: ${method} ${url}`)
    return handler(init, url)
  })
  return spy
}

export function requests(spy: ReturnType<typeof mockFetch>) {
  return spy.mock.calls.map(([input, init]) => ({
    url: String(input),
    method: init?.method ?? 'GET',
    body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
  }))
}

export const ok =
  <T,>(data: T, status = 200) =>
  () =>
    apiSuccess(data, status)

// sonner is replaced so `notify.run` only records its toast promise.
export const sonnerMock = () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
})

type ToastMessages = {
  loading: string
  success: string | ((data: unknown) => string)
  error: (err: unknown) => string
}

export async function toastOutcome(promiseFn: ReturnType<typeof vi.fn>) {
  const call = promiseFn.mock.calls.at(-1)
  if (!call) throw new Error('toast.promise was not called')
  const [promise, messages] = call as unknown as [
    Promise<unknown>,
    ToastMessages,
  ]
  try {
    const data = await promise
    return {
      type: 'success',
      message:
        typeof messages.success === 'function'
          ? messages.success(data)
          : messages.success,
    }
  } catch (err) {
    return { type: 'error', message: messages.error(err) }
  }
}
