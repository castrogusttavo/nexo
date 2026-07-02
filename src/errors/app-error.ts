import type { ErrorCode } from './codes'

export interface AppError {
  readonly code: ErrorCode
  readonly message: string
  readonly details?: unknown
}

export const appError = (
  code: ErrorCode,
  message: string,
  details?: unknown,
): AppError => ({
  code,
  message,
  ...(details !== undefined && { details }),
})

export const unauthorized = (message = 'Não autorizado'): AppError =>
  appError('UNAUTHORIZED', message)

export const invalidCredentials = (
  message = 'Credenciais inválidas',
): AppError => appError('INVALID_CREDENTIALS', message)

export const forbidden = (message = 'Permissão insuficiente'): AppError =>
  appError('FORBIDDEN', message)

export const notFound = (resource: string): AppError =>
  appError('RESOURCE_NOT_FOUND', `${resource} not found`)

export const conflict = (message: string): AppError =>
  appError('CONFLICT', message)

export const usernameConflict = (
  message = 'Username já está em uso',
): AppError => appError('USERNAME_CONFLICT', message)

export const validationError = (message: string, details?: unknown): AppError =>
  appError('VALIDATION_ERROR', message, details)

export const badRequest = (message: string): AppError =>
  appError('BAD_REQUEST', message)

export const databaseError = (message = 'Database error'): AppError =>
  appError('DATABASE_ERROR', message)

export const rateLimited = (
  retryAfterSeconds: number,
  message = 'Muitas requisições',
): AppError => appError('RATE_LIMITED', message, { retryAfterSeconds })

export const projectNotFound = (): AppError =>
  appError('PROJECT_NOT_FOUND', 'Project not found')

export const projectForbidden = (
  message = 'Sem acesso a este projeto',
): AppError => appError('PROJECT_FORBIDDEN', message)

export const projectSlugConflict = (
  message = 'Slug já está em uso neste workspace',
): AppError => appError('PROJECT_SLUG_CONFLICT', message)

export const storageError = (
  message = 'Falha ao armazenar o arquivo',
): AppError => appError('STORAGE_ERROR', message)
export const projectMemberAlreadyExists = (
  message = 'Usuário já é membro deste projeto',
): AppError => appError('PROJECT_MEMBER_ALREADY_EXISTS', message)

export const projectMemberNotFound = (
  message = 'Membro não encontrado neste projeto',
): AppError => appError('PROJECT_MEMBER_NOT_FOUND', message)

export const projectMemberNotInWorkspace = (
  message = 'Usuário não pertence a este workspace',
): AppError => appError('PROJECT_MEMBER_NOT_IN_WORKSPACE', message)
