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
export const invitationNotFound = (): AppError =>
  appError('INVITATION_NOT_FOUND', 'Convite não encontrado')

export const invitationNotPending = (
  message = 'Este convite não está mais disponível',
): AppError => appError('INVITATION_NOT_PENDING', message)

export const invitationExpired = (message = 'Este convite expirou'): AppError =>
  appError('INVITATION_EXPIRED', message)

export const invitationEmailMismatch = (
  message = 'Este convite foi enviado para outro e-mail',
): AppError => appError('INVITATION_EMAIL_MISMATCH', message)

export const invitationDuplicate = (
  message = 'Já existe um convite pendente para este e-mail',
): AppError => appError('INVITATION_DUPLICATE', message)

export const invitationAlreadyMember = (
  message = 'Este usuário já é membro do workspace',
): AppError => appError('INVITATION_ALREADY_MEMBER', message)

export const projectMemberAlreadyExists = (
  message = 'Usuário já é membro deste projeto',
): AppError => appError('PROJECT_MEMBER_ALREADY_EXISTS', message)

export const projectMemberNotFound = (
  message = 'Membro não encontrado neste projeto',
): AppError => appError('PROJECT_MEMBER_NOT_FOUND', message)

export const projectMemberNotInWorkspace = (
  message = 'Usuário não pertence a este workspace',
): AppError => appError('PROJECT_MEMBER_NOT_IN_WORKSPACE', message)

export const seatLimitReached = (
  message = 'Limite de assentos do plano atingido',
): AppError => appError('SEAT_LIMIT_REACHED', message)

export const featureNotInPlan = (
  message = 'Recurso não disponível no plano atual',
): AppError => appError('FEATURE_NOT_IN_PLAN', message)

export const paymentError = (
  message = 'Falha ao processar o pagamento',
): AppError => appError('PAYMENT_ERROR', message)

export const mailError = (
  message = 'Não foi possível enviar sua mensagem',
): AppError => appError('MAIL_ERROR', message)

export const couponInvalid = (
  message = 'Cupom inválido ou expirado',
): AppError => appError('COUPON_INVALID', message)
