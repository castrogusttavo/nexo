import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { HeaderWrongEmailMenu } from '../header-wrong-email-menu'

const { push, signOut } = vi.hoisted(() => ({
  push: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { signOut } }))

function renderButton(
  props: Partial<React.ComponentProps<typeof HeaderWrongEmailMenu>> = {},
) {
  return renderWithProviders(
    <HeaderWrongEmailMenu
      name='Ana Souza'
      email='ana@nexo.dev'
      image={null}
      {...props}
    />,
  )
}

beforeEach(() => {
  signOut.mockResolvedValue(undefined)
})

describe('<HeaderWrongEmailMenu />', () => {
  it('shows the name of the account being set up', () => {
    renderButton()

    expect(
      screen.getByRole('button', { name: /Ana Souza/ }),
    ).toBeInTheDocument()
  })

  it('falls back to the e-mail before the name is filled in', () => {
    renderButton({ name: null })

    expect(
      screen.getByRole('button', { name: /ana@nexo\.dev/ }),
    ).toBeInTheDocument()
  })

  it('shows the initials while no avatar is set', () => {
    renderButton()

    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('offers a single way out of the wrong account', async () => {
    const { user } = renderButton()

    await user.click(screen.getByRole('button', { name: /Ana Souza/ }))

    expect(
      (await screen.findAllByRole('menuitem')).map((item) => item.textContent),
    ).toEqual(['E-mail incorreto'])
  })

  it('signs the user out and sends them back to sign-in', async () => {
    const { user } = renderButton()

    await user.click(screen.getByRole('button', { name: /Ana Souza/ }))
    await user.click(
      await screen.findByRole('menuitem', { name: 'E-mail incorreto' }),
    )

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce())
    await waitFor(() => expect(push).toHaveBeenCalledWith('/sign-in'))
  })
})
