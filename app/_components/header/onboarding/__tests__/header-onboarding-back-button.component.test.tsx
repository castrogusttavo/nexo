import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deferredResponse,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { OnboardingBackButton } from '../header-onboarding-back-button'

const { push, usePathname, goBackOnboarding } = vi.hoisted(() => ({
  push: vi.fn(),
  usePathname: vi.fn(),
  goBackOnboarding: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname,
}))
vi.mock('@/app/onboarding/actions', () => ({ goBackOnboarding }))

function renderButton(pathname: string) {
  usePathname.mockReturnValue(pathname)
  return renderWithProviders(<OnboardingBackButton />)
}

const backButton = () => screen.queryByRole('button', { name: 'Voltar' })

beforeEach(() => {
  goBackOnboarding.mockResolvedValue(undefined)
})

describe('<OnboardingBackButton />', () => {
  it.each([
    ['/onboarding/role-setup', '/onboarding/profile-setup'],
    ['/onboarding/goals-setup', '/onboarding/role-setup'],
    ['/onboarding/workspace-setup', '/onboarding/goals-setup'],
  ])('walks back from %s to %s', async (current, previous) => {
    const { user } = renderButton(current)

    await user.click(backButton() as HTMLElement)

    await waitFor(() => expect(goBackOnboarding).toHaveBeenCalledOnce())
    await waitFor(() => expect(push).toHaveBeenCalledWith(previous))
  })

  it('hides itself on the first onboarding step', () => {
    renderButton('/onboarding/consent-setup')

    expect(backButton()).not.toBeInTheDocument()
  })

  it('hides itself outside the onboarding flow', () => {
    renderButton('/nexo/projects')

    expect(backButton()).not.toBeInTheDocument()
  })

  it('rewinds the server step before navigating', async () => {
    const order: string[] = []
    goBackOnboarding.mockImplementation(async () => {
      order.push('server')
    })
    push.mockImplementation(() => {
      order.push('navigate')
    })
    const { user } = renderButton('/onboarding/role-setup')

    await user.click(backButton() as HTMLElement)

    await waitFor(() => expect(order).toEqual(['server', 'navigate']))
  })

  it('blocks a second click while the step is being rewound', async () => {
    const deferred = deferredResponse()
    goBackOnboarding.mockReturnValue(deferred.promise)
    const { user } = renderButton('/onboarding/role-setup')

    await user.click(backButton() as HTMLElement)

    await waitFor(() => expect(backButton()).toBeDisabled())
    deferred.resolve(new Response(null))
    await waitFor(() => expect(push).toHaveBeenCalledOnce())
    expect(goBackOnboarding).toHaveBeenCalledOnce()
  })
})
