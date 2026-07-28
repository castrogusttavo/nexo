import type { SuccessResponse } from '@/types/http-response'

// Distinguishes a controlled, backend-supplied error message (already in
// pt-BR, safe to show as-is) from any other thrown error (network failures,
// unexpected runtime exceptions) whose `.message` is never meant for users.
export class ApiError extends Error {}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null)
  throw new ApiError(body?.message ?? fallback)
}

// Fetches and return the `data` payload, throwing `Error(message)` on failure
export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackError = 'Algo deu errado',
): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) await throwApiError(res, fallbackError)
  const json: SuccessResponse<T> = await res.json()
  return json.data
}

// Loike `apiFetch`, but for endpoints whose success body is not needed
export async function apiSend(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackError = 'Algo deu errado',
): Promise<void> {
  const res = await fetch(input, init)
  if (!res.ok) await throwApiError(res, fallbackError)
}

// Like `apiFetch`, but for the common POST/PATCH-with-JSON-body case —
// collapses the repeated Content-Type + JSON.stringify boilerplate.
export async function apiFetchJson<T>(
  input: RequestInfo | URL,
  method: string,
  body?: unknown,
  fallbackError = 'Algo deu errado',
): Promise<T> {
  return apiFetch<T>(
    input,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    fallbackError,
  )
}
