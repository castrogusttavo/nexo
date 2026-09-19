import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactElement, ReactNode } from 'react'
import { vi } from 'vitest'
import type { ErrorResponse, SuccessResponse } from '@/types/http-response'

// Retries off so a failing request settles on the first attempt, and an
// infinite gcTime so cache reads made after a mutation still see the data.
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  })
}

type ProviderOptions = {
  queryClient?: QueryClient
  /** Initial URL query string for components/hooks backed by nuqs. */
  searchParams?: string | Record<string, string>
}

function createWrapper({
  queryClient = createTestQueryClient(),
  searchParams,
}: ProviderOptions) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NuqsTestingAdapter searchParams={searchParams}>
          {children}
        </NuqsTestingAdapter>
      </QueryClientProvider>
    )
  }
  return { Wrapper, queryClient }
}

/**
 * Renders `ui` inside the app's client providers (TanStack Query + nuqs)
 * and returns a `user-event` instance bound to it alongside the usual
 * Testing Library queries.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient,
    searchParams,
    ...options
  }: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { Wrapper, queryClient: client } = createWrapper({
    queryClient,
    searchParams,
  })
  return {
    user: userEvent.setup(),
    queryClient: client,
    ...render(ui, { wrapper: Wrapper, ...options }),
  }
}

/** `renderHook` with the same providers as `renderWithProviders`. */
export function renderHookWithProviders<T>(
  hook: () => T,
  options: ProviderOptions = {},
) {
  const { Wrapper, queryClient } = createWrapper(options)
  return { queryClient, ...renderHook(hook, { wrapper: Wrapper }) }
}

/** A `Response` shaped like the API's `successResponse` envelope. */
export function apiSuccess<T>(data: T, statusCode = 200): Response {
  const body: SuccessResponse<T> = { success: true, statusCode, data }
  return Response.json(body, { status: statusCode })
}

/** A `Response` shaped like the API's `errorResponse` envelope. */
export function apiError(
  statusCode: number,
  message?: string,
  code = 'ERROR',
): Response {
  const body: ErrorResponse = {
    success: false,
    statusCode,
    error: { code },
    ...(message && { message }),
  }
  return Response.json(body, { status: statusCode })
}

/**
 * Spies on the global `fetch`. Queue responses with
 * `.mockResolvedValueOnce(apiSuccess(...))`; inspect calls with
 * `getFetchCall`. Restored automatically by `setup.component.ts`.
 */
export function mockFetch() {
  return vi.spyOn(globalThis, 'fetch')
}

/** The url, method and parsed JSON body of the nth (0-based) fetch call. */
export function getFetchCall(
  fetchSpy: ReturnType<typeof mockFetch>,
  index = 0,
) {
  const [input, init] = fetchSpy.mock.calls[index] ?? []
  return {
    url: String(input),
    method: init?.method ?? 'GET',
    body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
  }
}

/**
 * A fetch response the test settles by hand — for asserting state while a
 * request is still in flight (optimistic updates, pending/disabled UI):
 * `mockFetch().mockReturnValueOnce(deferred.promise)`, then
 * `deferred.resolve(apiSuccess(...))`.
 */
export function deferredResponse() {
  let resolve: (response: Response) => void = () => {}
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve }
}
