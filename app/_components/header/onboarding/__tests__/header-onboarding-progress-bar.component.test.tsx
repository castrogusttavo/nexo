import { waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { OnboardingProgressBar } from '../header-onboarding-progress-bar'

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname }))

// The bar is a decorative strip with no role of its own, so the filled part
// is read straight from the DOM — its inline width is the whole behaviour.
function renderBar(pathname: string) {
  usePathname.mockReturnValue(pathname)
  const { container, rerender } = renderWithProviders(<OnboardingProgressBar />)
  const fill = container.firstElementChild?.firstElementChild as HTMLElement
  return { container, fill, rerender }
}

describe('<OnboardingProgressBar />', () => {
  it('starts empty before the first animation frame', () => {
    const { fill } = renderBar('/onboarding/profile-setup')

    expect(fill.style.width).toBe('0%')
  })

  it.each([
    ['/onboarding/consent-setup', '20%'],
    ['/onboarding/profile-setup', '40%'],
    ['/onboarding/role-setup', '60%'],
    ['/onboarding/goals-setup', '80%'],
    ['/onboarding/workspace-setup', '100%'],
  ])('fills to %s of the way on %s', async (pathname, width) => {
    const { fill } = renderBar(pathname)

    await waitFor(() => expect(fill.style.width).toBe(width))
  })

  it('falls back to the first step on an unknown route', async () => {
    const { fill } = renderBar('/onboarding/unknown')

    await waitFor(() => expect(fill.style.width).toBe('20%'))
  })

  it('rounds off the right corner only on the last step', async () => {
    const { fill } = renderBar('/onboarding/workspace-setup')

    await waitFor(() => expect(fill.style.width).toBe('100%'))
    expect(fill).toHaveClass('rounded-tr-lg')
  })

  it('leaves the right corner square before the last step', async () => {
    const { fill } = renderBar('/onboarding/goals-setup')

    await waitFor(() => expect(fill.style.width).toBe('80%'))
    expect(fill).not.toHaveClass('rounded-tr-lg')
  })

  it('grows when the flow moves to the next step', async () => {
    const { fill, rerender } = renderBar('/onboarding/profile-setup')

    await waitFor(() => expect(fill.style.width).toBe('40%'))

    usePathname.mockReturnValue('/onboarding/role-setup')
    rerender(<OnboardingProgressBar />)

    await waitFor(() => expect(fill.style.width).toBe('60%'))
  })
})
