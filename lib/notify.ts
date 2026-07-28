import { ApiError } from "@/src/hooks/_fetch"
import { toast } from "sonner"

function messageFrom(input: unknown, fallback: string): string {
  if (typeof input === 'string') return input
  if (input instanceof ApiError && input.message) return input.message
  return fallback
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
  // Single toast that animates loading -> success/error, tracking `promise`
  // Returns the same promise so callers can still await `/`try-catck` it for
  // follow-up control flow (closing a dialog, router.refresh(), etc).
  mutate: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((data: T) => string); error?: string }
  ): Promise<T> => {
    toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (err: unknown) =>
      messageFrom(err, messages.error ?? 'Algo deu errado')
    })
    return promise
  }
}
