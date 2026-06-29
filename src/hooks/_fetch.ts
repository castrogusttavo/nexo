import type { SuccessResponse } from '@/types/http-response'

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null)
  throw new Error(body?.message ?? fallback)
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
