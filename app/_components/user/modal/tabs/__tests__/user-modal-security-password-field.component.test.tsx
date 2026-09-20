import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { UserModalSecurityPasswordField } from '../user-modal-security-password-field'

const { requestPasswordReset } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}))
vi.mock('@/src/lib/auth-client', () => ({
  authClient: { requestPasswordReset },
}))

// Real sonner attaches its own handlers to the tracked promise, so the stub
// resolves/rejects like the real thing and `notify.mutate` can be awaited.
vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

function renderField(
  props: Partial<
    React.ComponentProps<typeof UserModalSecurityPasswordField>
  > = {},
) {
  return renderWithProviders(
    <UserModalSecurityPasswordField
      email='ana@nexo.dev'
      hasPassword={true}
      {...props}
    />,
  )
}

beforeEach(() => {
  requestPasswordReset.mockResolvedValue({ error: null })
})

describe('<UserModalSecurityPasswordField />', () => {
  it('offers to reset the password of an account that has one', () => {
    renderField()

    expect(
      screen.getByRole('button', { name: 'Redefinir senha' }),
    ).toHaveAccessibleDescription(/link seguro para redefinir sua senha/)
  })

  it('offers to define a first password for a social-only account', () => {
    renderField({ hasPassword: false })

    expect(
      screen.getByRole('button', { name: 'Definir senha' }),
    ).toHaveAccessibleDescription(/criada com login social/)
  })

  it('keeps the reset wording while the account state is still unknown', () => {
    renderField({ hasPassword: null })

    expect(
      screen.getByRole('button', { name: 'Redefinir senha' }),
    ).toBeInTheDocument()
  })

  it('requests the reset e-mail for the current address', async () => {
    const { user } = renderField()

    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(requestPasswordReset).toHaveBeenCalledExactlyOnceWith({
      email: 'ana@nexo.dev',
      redirectTo: '/reset-password',
    })
    expect(toast.promise).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        success: 'Enviamos um e-mail para você redefinir sua senha',
      }),
    )
  })

  it('announces the first-password wording for a social-only account', async () => {
    const { user } = renderField({ hasPassword: false })

    await user.click(screen.getByRole('button', { name: 'Definir senha' }))

    expect(toast.promise).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        success: 'Enviamos um e-mail para você definir sua senha',
      }),
    )
  })

  it('does nothing while the session e-mail is still loading', async () => {
    const { user } = renderField({ email: undefined })

    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('disables the button while the request is in flight and re-enables it after', async () => {
    let resolve: (value: { error: null }) => void = () => {}
    requestPasswordReset.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { user } = renderField()

    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))
    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled()

    resolve({ error: null })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Redefinir senha' }),
      ).toBeEnabled(),
    )
  })

  it('re-enables the button when the request fails', async () => {
    requestPasswordReset.mockResolvedValue({ error: { message: 'boom' } })
    const { user } = renderField()

    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Redefinir senha' }),
      ).toBeEnabled(),
    )
  })
})
