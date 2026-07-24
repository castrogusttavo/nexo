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

export const paymentError = (
  message = 'Falha ao processar o pagamento',
): AppError => appError('PAYMENT_ERROR', message)

export const mailError = (
  message = 'Não foi possível enviar sua mensagem',
): AppError => appError('MAIL_ERROR', message)

export const couponInvalid = (
  message = 'Cupom inválido ou expirado',
): AppError => appError('COUPON_INVALID', message)

export const careerJobNotFound = (): AppError =>
  appError('CAREER_JOB_NOT_FOUND', 'Vaga não encontrada')

export const careerJobClosed = (
  message = 'Esta vaga não está mais recebendo candidaturas',
): AppError => appError('CAREER_JOB_CLOSED', message)

export const careerJobForbidden = (
  message = 'Sem permissão para gerenciar vagas',
): AppError => appError('CAREER_JOB_FORBIDDEN', message)

export const careerJobSlugTaken = (
  message = 'Já existe uma vaga com este slug',
): AppError => appError('CAREER_JOB_SLUG_TAKEN', message)

export const featureNotInPlan = (
  message = 'Recurso não disponível no seu plano atual',
): AppError => appError('FEATURE_NOT_IN_PLAN', message)

export const memberImportInvalidFormat = (
  message = 'Arquivo CSV inválido. Colunas esperadas: email, username, name, role',
): AppError => appError('MEMBER_IMPORT_INVALID_FORMAT', message)

export const memberImportEmpty = (
  message = 'O arquivo CSV não contém linhas para importar',
): AppError => appError('MEMBER_IMPORT_EMPTY', message)

export const stateNotFound = (): AppError =>
  appError('STATE_NOT_FOUND', 'State not found')

export const stateForbidden = (message = 'Sem acesso a este state'): AppError =>
  appError('STATE_FORBIDDEN', message)

export const stateLastInGroup = (
  message = 'O grupo precisa manter ao menos um state',
): AppError => appError('STATE_LAST_IN_GROUP', message)

export const stateIsDefault = (
  message = 'Defina outro state como padrão antes de excluir este',
): AppError => appError('STATE_IS_DEFAULT', message)

export const labelNotFound = (): AppError =>
  appError('LABEL_NOT_FOUND', 'Label not found')

export const labelForbidden = (message = 'Sem acesso a este label'): AppError =>
  appError('LABEL_FORBIDDEN', message)

export const estimateSettingsNotFound = (): AppError =>
  appError('ESTIMATE_SETTINGS_NOT_FOUND', 'Estimate settings not found')

export const estimateSettingsForbidden = (
  message = 'Sem acesso às configurações de estimativas',
): AppError => appError('ESTIMATE_SETTINGS_FORBIDDEN', message)

export const moduleNotFound = (): AppError =>
  appError('MODULE_NOT_FOUND', 'Module not found')

export const moduleForbidden = (
  message = 'Sem acesso a este módulo',
): AppError => appError('MODULE_FORBIDDEN', message)

export const moduleMemberAlreadyExists = (): AppError =>
  appError('MODULE_MEMBER_ALREADY_EXISTS', 'Usuário já é membro do módulo')

export const moduleMemberNotFound = (): AppError =>
  appError('MODULE_MEMBER_NOT_FOUND', 'Membro do módulo não encontrado')

export const cycleNotFound = (): AppError =>
  appError('CYCLE_NOT_FOUND', 'Cycle not found')

export const cycleForbidden = (message = 'Sem acesso a este cycle'): AppError =>
  appError('CYCLE_FORBIDDEN', message)

export const cycleAlreadyActive = (
  message = 'Já existe um ciclo em progresso neste projeto',
): AppError => appError('CYCLE_ALREADY_ACTIVE', message)

export const cycleMemberAlreadyExists = (): AppError =>
  appError('CYCLE_MEMBER_ALREADY_EXISTS', 'Usuário já é membro do ciclo')

export const cycleMemberNotFound = (): AppError =>
  appError('CYCLE_MEMBER_NOT_FOUND', 'Membro do ciclo não encontrado')
