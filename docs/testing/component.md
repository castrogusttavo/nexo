# Component tests

Component tests answer: do this hook or client component behave correctly in a DOM, given the API answers a certain way? They cover request shape, cache writes and invalidation, optimistic updates and rollback, `enabled` guards, validation, submit payloads and pending or error states.

## What lives here

The `component` project (`vite.config.ts`) runs under `jsdom` and includes:

- `src/hooks/**/__tests__/*.component.test.tsx`
- `components/**/__tests__/*.component.test.tsx` (includes `components/hooks` and pure client logic such as `components/filters`)
- `app/**/__tests__/*.component.test.tsx`: a route's `__tests__/` or its `_components/__tests__/`, and `app/_components/**/__tests__/`

Timeout is 5 s. `server.deps.inline` is set for `@platejs/math` and `@platejs/excalidraw` so the real Plate editor can render under jsdom (katex stylesheet and CommonJS lodash interop).

```bash
pnpm test:component
pnpm test:coverage:component      # COVERAGE_SCOPE=frontend, see mutation-and-coverage.md
pnpm vitest --project component src/hooks/__tests__/use-sticky-note.component.test.tsx
```

## Setup

`src/__tests__/setup.component.ts` provides:

- jest-dom matchers;
- a `window.matchMedia` stub that matches nothing (override per test);
- an in-memory `localStorage` and `sessionStorage`, cleared after each test (Node 25+ ships its own `localStorage` global that shadows jsdom's);
- `ResizeObserver`, `Element.prototype.scrollIntoView` and `document.elementFromPoint` stubs, needed by cmdk and input-otp;
- after each test: `cleanup()`, storage clear, `vi.restoreAllMocks()`, `vi.clearAllMocks()`.

## Helpers

All in `src/__tests__/helpers/component.tsx`:

| Helper | Use |
| --- | --- |
| `renderWithProviders(ui, { queryClient?, searchParams? })` | Renders inside TanStack Query (`retry: false`, `gcTime: Infinity`) and nuqs's `NuqsTestingAdapter`. Returns the Testing Library result plus `user` (a `user-event` instance) and `queryClient`. |
| `renderHookWithProviders(hook, options)` | Same providers around `renderHook`. |
| `mockFetch()` | `vi.spyOn(globalThis, 'fetch')`. Queue answers with `.mockResolvedValueOnce(...)`. |
| `apiSuccess(data, status = 200)` / `apiError(status, message?, code = 'ERROR')` | A `Response` in the API's `{ success, statusCode, data \| error }` envelope. |
| `getFetchCall(spy, index = 0)` | `{ url, method, body }` of the nth call, with the body parsed. |
| `deferredResponse()` | A fetch answer the test resolves by hand, to assert state while a request is in flight. |

`src/__tests__/helpers/route-fetch.tsx` adds `routeFetch({ 'GET /api/x': handler })`, which answers by `METHOD url` and throws on an unexpected request, and `requests(spy)`. `src/__tests__/helpers/a11y.ts` exports `expectNoA11yViolations(container)`, an axe run with the rules jsdom cannot evaluate (`color-contrast`, `target-size`, `scrollable-region-focusable`) disabled.

## How to write one

The rule is to answer at the network boundary and let the real hooks run. Nothing mocks the hook under test.

```tsx
const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(notes))
const { result } = renderHookWithProviders(() => useStickyNotes())

await waitFor(() => expect(result.current.isSuccess).toBe(true))
expect(getFetchCall(fetchSpy)).toMatchObject({ url: '/api/sticky-notes', method: 'GET' })
```

That is `src/hooks/__tests__/use-sticky-note.component.test.tsx`, which also tests the failure message (`apiError(500, 'Falha no servidor')`) and the fallback message when the body has none. For optimistic UI, hold the response with `deferredResponse()`, assert the optimistic state, then call `resolve(apiSuccess(...))`.

Query by role or label with the exact pt-BR strings (`getByRole('button', { name: 'Adicionar sticky' })`). The product copy is Portuguese, so a test in English would not find it.

## Key decisions

- Frontend coverage counts only files that ship to the browser (`'use client'`, hooks, pure client modules); Server Components are excluded because Testing Library cannot render them. The e2e and browser suites exercise them. See [mutation-and-coverage](./mutation-and-coverage.md).
- Hooks and components with logic get a component test in step 13 of the [feature workflow](../development/feature-workflow.md); wiring a hook into an existing component is part of "done".

## Gotchas

- `app/(web)` marketing pages and `app/api` are excluded from frontend coverage (`clientSourceFiles()` in `vite.config.ts`).
- Parentheses in route-group globs must be escaped in coverage globs or they silently match nothing; the `include` globs above have no groups.
- Without `searchParams`, nuqs state starts empty; pass the query string you want.

## Related files

- `vite.config.ts` (`component` project), `src/__tests__/setup.component.ts`
- `src/__tests__/helpers/component.tsx`, `route-fetch.tsx`, `a11y.ts`
- `src/hooks/__tests__/use-sticky-note.component.test.tsx`, `app/_components/user/sticky/__tests__/`
- [Testing overview](./README.md)
