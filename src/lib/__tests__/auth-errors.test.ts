import { describe, expect, it } from 'vitest'
import { authErrorMessage } from '../auth-errors'
import { CONNECTION_ERROR } from '../auth-request'

const FALLBACK = 'Algo deu errado'

// The shapes below are what `authClient` actually resolves with: better-fetch
// spreads the JSON body of a failed response into `error` and adds the HTTP
// status. Better Auth's bodies carry an UPPER_SNAKE `code` plus an English
// `message`; the app's own limiter nests its body under `error`.
describe('authErrorMessage', () => {
  it.each([
    ['INVALID_EMAIL_OR_PASSWORD', 'Invalid email or password', 401],
    ['INVALID_PASSWORD', 'Invalid password', 400],
    [
      'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      'User already exists. Use another email.',
      422,
    ],
    ['INVALID_OTP', 'Invalid OTP', 400],
    ['OTP_EXPIRED', 'OTP expired', 400],
    ['INVALID_CODE', 'Invalid code', 401],
    ['INVALID_BACKUP_CODE', 'Invalid backup code', 401],
    [
      'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE',
      'Too many attempts. Please request a new code.',
      400,
    ],
    ['INVALID_TOKEN', 'Invalid token', 400],
  ])('never lets the library message for %s through', (code, message, status) => {
    const text = authErrorMessage({ code, message, status }, FALLBACK)

    expect(text).not.toBe(message)
    expect(text).not.toBe(FALLBACK)
  })

  it('translates a wrong e-mail or password', () => {
    expect(
      authErrorMessage(
        {
          code: 'INVALID_EMAIL_OR_PASSWORD',
          message: 'Invalid email or password',
          status: 401,
        },
        FALLBACK,
      ),
    ).toBe('E-mail ou senha inválidos')
  })

  it('translates a wrong password on a re-authenticated action', () => {
    expect(
      authErrorMessage(
        { code: 'INVALID_PASSWORD', message: 'Invalid password', status: 400 },
        FALLBACK,
      ),
    ).toBe('Senha incorreta')
  })

  it('translates an unknown English message to the caller fallback', () => {
    expect(
      authErrorMessage(
        { code: 'SOMETHING_NEW', message: 'Something new broke', status: 400 },
        FALLBACK,
      ),
    ).toBe(FALLBACK)
  })

  it('uses the fallback when the error carries nothing usable', () => {
    expect(authErrorMessage({}, FALLBACK)).toBe(FALLBACK)
    expect(authErrorMessage(null, FALLBACK)).toBe(FALLBACK)
    expect(authErrorMessage(undefined, FALLBACK)).toBe(FALLBACK)
  })

  it('keeps the connection error produced by settleAuthRequest', () => {
    expect(authErrorMessage({ message: CONNECTION_ERROR }, FALLBACK)).toBe(
      CONNECTION_ERROR,
    )
  })

  it('shows the app limiter message, which the app writes in pt-BR', () => {
    // `handleError` envelope: `message` on top, `code` nested under `error`.
    expect(
      authErrorMessage(
        {
          status: 429,
          success: false,
          statusCode: 429,
          message: 'Muitas requisições',
          error: { code: 'RATE_LIMITED' },
        },
        FALLBACK,
      ),
    ).toBe('Muitas requisições')
    // `overloadedError()` from the concurrency gate: flat Better Auth shape.
    expect(
      authErrorMessage(
        {
          status: 429,
          code: 'RATE_LIMITED',
          message: 'Muitos acessos agora, tente novamente em instantes',
        },
        FALLBACK,
      ),
    ).toBe('Muitos acessos agora, tente novamente em instantes')
  })

  it('translates any other 429, including Better Auth own limiter', () => {
    const rateLimited =
      'Muitas tentativas. Aguarde um instante e tente novamente'

    expect(
      authErrorMessage(
        { status: 429, message: 'Too many requests. Please try again later.' },
        FALLBACK,
      ),
    ).toBe(rateLimited)
    expect(authErrorMessage({ status: 429 }, FALLBACK)).toBe(rateLimited)
    expect(
      authErrorMessage(
        { status: 429, error: { code: 'RATE_LIMITED' } },
        FALLBACK,
      ),
    ).toBe(rateLimited)
  })
})
