import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import ErrorPage from '../error'

// jsdom refuses to navigate or reload, so `window.location` is swapped for
// a recorder while these tests run.
const realLocation = window.location
let assigned: string[]
let reloads: number

beforeEach(() => {
  assigned = []
  reloads = 0
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      ...realLocation,
      get href() {
        return realLocation.href
      },
      set href(value: string) {
        assigned.push(value)
      },
      reload: () => {
        reloads += 1
      },
    },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: realLocation,
  })
  vi.restoreAllMocks()
})

describe('<ErrorPage />', () => {
  it('explains that the page failed to load', () => {
    renderWithProviders(<ErrorPage />)

    expect(
      screen.getByRole('heading', { name: 'This page couldn’t load' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('A server error occurred. Reload to try again.'),
    ).toBeInTheDocument()
  })

  it('offers exactly two ways out', () => {
    renderWithProviders(<ErrorPage />)

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Home', 'Reload'])
  })

  it('sends the visitor home', async () => {
    const { user } = renderWithProviders(<ErrorPage />)

    await user.click(screen.getByRole('button', { name: 'Home' }))

    expect(assigned).toEqual(['/'])
    expect(reloads).toBe(0)
  })

  it('reloads the current page', async () => {
    const { user } = renderWithProviders(<ErrorPage />)

    await user.click(screen.getByRole('button', { name: 'Reload' }))

    expect(reloads).toBe(1)
    expect(assigned).toEqual([])
  })
})
