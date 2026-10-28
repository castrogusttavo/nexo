import { ApiError } from "@/src/hooks/_fetch"
import { toast } from "sonner"

function messageFrom(input: unknown, fallback: string): string {
  if (typeof input === 'string') return input
  if (input instanceof ApiError && input.message) return input.message
  return fallback
}

type MutateMessages<T> = {
  loading: string
  success: string | ((data: T) => string)
  error?: string
}

// Single toast that animates loading -> success/error, tracking `promise`.
// Returns the same promise so callers can still await it for follow-up
// control flow (closing a dialog, router.refresh(), etc).
function mutate<T>(promise: Promise<T>, messages: MutateMessages<T>): Promise<T> {
  toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (err: unknown) => messageFrom(err, messages.error ?? 'Algo deu errado'),
  })
  return promise
}

export const notify = {
  success: (message: string) => toast.success(message),
  // `fallback` is typed `unknown` so `onError: notify.error` is assignable to
  // react-query's `(error, variables, ...)` handler (variables lands here and
  // is ignored); explicit callers still pass a string fallback.
  error: (input?: unknown, fallback: unknown = 'Algo deu errado') =>
    toast.error(
      messageFrom(
        input,
        typeof fallback === 'string' ? fallback : 'Algo deu errado',
      ),
    ),
  info: (message: string) => toast.info(message),
  warning: (message: string) => toast.warning(message),
  loading: (message: string) => toast.loading(message),
  promise: toast.promise,
  mutate,
  // For handlers with nothing left to do when the promise fails: the toast
  // already told the user. Resolves to whether it succeeded and never
  // rejects, so callers need no empty try/catch.
  run: <T>(promise: Promise<T>, messages: MutateMessages<T>): Promise<boolean> =>
    mutate(promise, messages).then(
      () => true,
      () => false,
    ),
}
