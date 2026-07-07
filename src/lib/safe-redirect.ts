/**
 * Valida um destino de redirect vindo de query string (`?redirect=`).
 * Aceita apenas paths relativos ao próprio app — bloqueia open redirect
 * (`https://…`, `//host`, `/\host`). Retorna `null` quando inválido.
 */
export function safeRedirectPath(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}
