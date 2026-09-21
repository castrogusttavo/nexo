import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  getPrice,
  PLANS,
  priceForBilling,
} from '@/app/(web)/_components/pricing/plans'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { BillingUpgrade } from '../billing-upgrade'

function renderUpgrade({
  currentPlan = 'FREE',
  searchParams,
}: {
  currentPlan?: string
  searchParams?: string
} = {}) {
  return renderWithProviders(<BillingUpgrade currentPlan={currentPlan} />, {
    searchParams,
  })
}

/** The tier column holding `plan`, found through its title cell. */
function tierColumn(plan: string) {
  const column = screen.getByText(plan).closest('div.flex.flex-col.gap-4')
  if (!(column instanceof HTMLElement)) throw new Error(`No column for ${plan}`)
  return column
}

function priceOf(plan: 'PRO' | 'BUSINESS', billing: 'monthly' | 'yearly') {
  const price = getPrice(plan)
  if (!price) throw new Error(`No price for ${plan}`)
  // Testing Library normalizes the formatter's non-breaking space away.
  return formatCurrency(priceForBilling(price, billing)).replace(/\u00a0/g, ' ')
}

const billingToggle = () => screen.getByRole('switch')

describe('<BillingUpgrade /> pricing', () => {
  it('defaults to yearly billing', () => {
    renderUpgrade()

    expect(billingToggle()).toHaveAttribute('aria-checked', 'true')
    expect(
      within(tierColumn('Pro')).getByText(priceOf('PRO', 'yearly')),
    ).toBeInTheDocument()
    expect(
      within(tierColumn('Business')).getByText(priceOf('BUSINESS', 'yearly')),
    ).toBeInTheDocument()
  })

  it('reads the cadence from the URL', () => {
    renderUpgrade({ searchParams: 'billing=monthly' })

    expect(billingToggle()).toHaveAttribute('aria-checked', 'false')
    expect(
      within(tierColumn('Pro')).getByText(priceOf('PRO', 'monthly')),
    ).toBeInTheDocument()
  })

  it('switches to monthly prices and checkout links', async () => {
    const { user } = renderUpgrade()

    await user.click(billingToggle())

    await waitFor(() =>
      expect(
        within(tierColumn('Pro')).getByText(priceOf('PRO', 'monthly')),
      ).toBeInTheDocument(),
    )
    expect(
      screen.getByRole('link', { name: 'Atualizar para Pro' }),
    ).toHaveAttribute('href', '/upgrade?plan=PRO&billing=monthly')
  })

  it('switches back to yearly', async () => {
    const { user } = renderUpgrade({ searchParams: 'billing=monthly' })

    await user.click(billingToggle())

    await waitFor(() =>
      expect(
        within(tierColumn('Pro')).getByText(priceOf('PRO', 'yearly')),
      ).toBeInTheDocument(),
    )
  })

  it('asks Enterprise buyers to talk to sales', () => {
    renderUpgrade()

    expect(screen.getByText('Cotação a pedido')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Falar com vendas' }),
    ).toHaveAttribute('href', '/talk-to-sales')
  })

  it('links to the full comparison', () => {
    renderUpgrade()

    expect(
      screen.getByRole('link', { name: /Ver comparação detalhada/ }),
    ).toHaveAttribute('href', '/pricing')
  })
})

describe('<BillingUpgrade /> current plan', () => {
  it('offers an upgrade to every other tier', () => {
    renderUpgrade()

    expect(
      screen.getByRole('link', { name: 'Atualizar para Pro' }),
    ).toHaveAttribute('href', '/upgrade?plan=PRO&billing=yearly')
    expect(
      screen.getByRole('link', { name: 'Atualizar para Business' }),
    ).toHaveAttribute('href', '/upgrade?plan=BUSINESS&billing=yearly')
    expect(
      screen.queryByRole('button', { name: 'Plano atual' }),
    ).not.toBeInTheDocument()
  })

  it('marks the subscribed tier instead of selling it again', () => {
    renderUpgrade({ currentPlan: 'PRO' })

    expect(
      within(tierColumn('Pro')).getByRole('button', { name: 'Plano atual' }),
    ).toBeDisabled()
    expect(
      screen.queryByRole('link', { name: 'Atualizar para Pro' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Atualizar para Business' }),
    ).toBeInTheDocument()
  })

  it('marks Enterprise as the current plan too', () => {
    renderUpgrade({ currentPlan: 'ENTERPRISE' })

    expect(
      within(tierColumn('Enterprise')).getByRole('button', {
        name: 'Plano atual',
      }),
    ).toBeDisabled()
    expect(
      screen.queryByRole('link', { name: 'Falar com vendas' }),
    ).not.toBeInTheDocument()
  })
})

describe('<BillingUpgrade /> highlights', () => {
  it('lists six highlights per tier', () => {
    renderUpgrade()

    const lists = screen.getAllByRole('list')
    expect(lists).toHaveLength(3)
    for (const list of lists) {
      expect(within(list).getAllByRole('listitem')).toHaveLength(6)
    }
  })

  it('names the first six features of each plan', () => {
    renderUpgrade()

    const [proList] = screen.getAllByRole('list')
    // The tooltip body itself only mounts on a real hover/focus-visible,
    // which jsdom cannot produce; the triggers carry the titles.
    for (const feature of PLANS.PRO.features.slice(0, 6)) {
      expect(
        within(proList).getByRole('button', { name: feature.title }),
      ).toBeInTheDocument()
    }
  })
})
