export const CONNECTION_ERROR =
  'Não foi possível conectar. Verifique sua internet e tente novamente.'

/**
 * Better Auth resolves API failures as `{ error }` and only rejects when the
 * request itself fails (network down, blocked). Folds that rejection into the
 * same `{ error }` shape so auth forms have a single error path and never get
 * stuck in their pending state.
 */
export async function settleAuthRequest<T>(
  request: Promise<T>,
): Promise<T | { data: null; error: { message: string } }> {
  try {
    return await request
  } catch {
    return { data: null, error: { message: CONNECTION_ERROR } }
  }
}
