import { toast } from "sonner"

function messageFrom(input: unknown, fallback: string): string {
  if (typeof input === 'string') return input
  if (input instanceof Error && input.message) return input.message
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
  promise: toast.promise
}
