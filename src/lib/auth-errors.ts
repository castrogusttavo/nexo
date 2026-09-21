import { CONNECTION_ERROR } from './auth-request'

const RATE_LIMITED_MESSAGE =
  'Muitas tentativas. Aguarde um instante e tente novamente'

const EXPIRED_CODE = 'O código expirou. Solicite um novo'
const INVALID_LINK = 'O link é inválido ou expirou'
const SESSION_EXPIRED = 'Sua sessão expirou. Entre novamente para continuar'
const TWO_FACTOR_DISABLED = 'A verificação em duas etapas não está ativada'
const USER_EXISTS = 'Já existe uma conta com este e-mail'

/**
 * pt-BR copy for the error codes Better Auth (core + the email-OTP and
 * two-factor plugins) and the auth route's own limiter can answer with.
 * Keyed by code, never by message: the library's messages are English and
 * may change wording between releases, the codes are its contract.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // core
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha inválidos',
  INVALID_PASSWORD: 'Senha incorreta',
  INVALID_EMAIL: 'E-mail inválido',
  USER_NOT_FOUND: 'Usuário não encontrado',
  USER_EMAIL_NOT_FOUND: 'Usuário não encontrado',
  EMAIL_NOT_VERIFIED: 'Confirme seu e-mail antes de entrar',
  PASSWORD_TOO_SHORT: 'A senha é curta demais',
  PASSWORD_TOO_LONG: 'A senha é longa demais',
  USER_ALREADY_EXISTS: USER_EXISTS,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: USER_EXISTS,
  FAILED_TO_CREATE_USER: 'Não foi possível criar a conta. Tente novamente',
  FAILED_TO_CREATE_SESSION: 'Não foi possível entrar. Tente novamente',
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    'Esta conta não tem senha. Entre com Google ou GitHub',
  INVALID_TOKEN: INVALID_LINK,
  TOKEN_EXPIRED: INVALID_LINK,
  SESSION_EXPIRED,
  SESSION_NOT_FRESH: SESSION_EXPIRED,
  EMAIL_ALREADY_VERIFIED: 'Este e-mail já foi confirmado',
  // email-otp plugin
  OTP_EXPIRED: EXPIRED_CODE,
  INVALID_OTP: 'Código inválido',
  TOO_MANY_ATTEMPTS: 'Muitas tentativas. Solicite um novo código',
  // two-factor plugin
  OTP_HAS_EXPIRED: EXPIRED_CODE,
  INVALID_CODE: 'Código inválido',
  INVALID_BACKUP_CODE: 'Código de backup inválido',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE:
    'Muitas tentativas. Solicite um novo código',
  ACCOUNT_TEMPORARILY_LOCKED:
    'Muitas tentativas de verificação. Sua conta foi bloqueada temporariamente, tente novamente mais tarde',
  INVALID_TWO_FACTOR_COOKIE: 'Sua verificação expirou. Entre novamente',
  OTP_NOT_ENABLED: TWO_FACTOR_DISABLED,
  TOTP_NOT_ENABLED: TWO_FACTOR_DISABLED,
  TWO_FACTOR_NOT_ENABLED: TWO_FACTOR_DISABLED,
  BACKUP_CODES_NOT_ENABLED: TWO_FACTOR_DISABLED,
}

/**
 * Codes only the app itself emits (Better Auth never does), whose messages
 * are written in pt-BR by us — `rateLimited()` in `src/errors/app-error.ts`
 * and `overloadedError()` in `auth-concurrency-gate.ts`.
 */
const APP_OWNED_CODES = new Set(['RATE_LIMITED'])

function field(source: unknown, key: string): unknown {
  return typeof source === 'object' && source !== null
    ? (source as Record<string, unknown>)[key]
    : undefined
}

/**
 * Turns an `authClient` error into copy a pt-BR user can read. Library
 * messages never pass through: a known code gets its translation, anything
 * else gets the caller's fallback. The only messages kept verbatim are the
 * app's own: the connection error from `settleAuthRequest` and the limiter's.
 */
export function authErrorMessage(error: unknown, fallback: string): string {
  const message = field(error, 'message')
  if (message === CONNECTION_ERROR) return CONNECTION_ERROR

  // Better Auth puts `code` at the top level; the app's `handleError`
  // envelope nests it under `error` (with `message` still at the top).
  const code = field(error, 'code') ?? field(field(error, 'error'), 'code')
  if (typeof code === 'string') {
    if (APP_OWNED_CODES.has(code)) {
      return typeof message === 'string' && message
        ? message
        : RATE_LIMITED_MESSAGE
    }
    if (Object.hasOwn(AUTH_ERROR_MESSAGES, code)) {
      return AUTH_ERROR_MESSAGES[code]
    }
  }

  if (field(error, 'status') === 429) return RATE_LIMITED_MESSAGE

  return fallback
}
