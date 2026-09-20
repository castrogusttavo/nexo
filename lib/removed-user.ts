/**
 * Content outlives its author. Deleting a user nulls the authorship columns
 * (`ON DELETE SET NULL`) instead of deleting the issue, comment or wiki page
 * that user wrote — the workspace keeps the collective work, the person is
 * erased. These are the user-facing pt-BR fallbacks for that state.
 */
export const REMOVED_USER_NAME = 'Usuário removido'

/** A project, module or cycle whose lead was deleted simply has no lead. */
export const NO_LEAD_NAME = 'Sem líder'

/** Name to render for an author that may have been removed. */
export function displayUserName(name?: string | null): string {
  return name?.trim() ? name : REMOVED_USER_NAME
}
