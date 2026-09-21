import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationNextButton,
  PaginationPrevious,
  PaginationPreviousButton,
} from '../pagination'

function renderLinkPagination() {
  return renderWithProviders(
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href='?page=1' />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='?page=1'>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='?page=2' isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href='?page=3' />
        </PaginationItem>
      </PaginationContent>
    </Pagination>,
  )
}

function renderButtonPagination(onPage = vi.fn()) {
  return renderWithProviders(
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPreviousButton disabled onClick={() => onPage(0)} />
        </PaginationItem>
        <PaginationItem>
          <PaginationButton isActive onClick={() => onPage(1)}>
            1
          </PaginationButton>
        </PaginationItem>
        <PaginationItem>
          <PaginationButton onClick={() => onPage(2)}>2</PaginationButton>
        </PaginationItem>
        <PaginationItem>
          <PaginationNextButton onClick={() => onPage(2)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>,
  )
}

describe('<Pagination /> landmark', () => {
  it('is a navigation landmark named in pt-BR', () => {
    renderLinkPagination()

    expect(
      screen.getByRole('navigation', { name: 'Paginação' }),
    ).toBeInTheDocument()
  })
})

describe('<PaginationLink /> — url-driven pages', () => {
  it('has no axe violations (aria-allowed-role included)', async () => {
    const { container } = renderLinkPagination()

    await expectNoA11yViolations(container, { disabledRules: ['region'] })
  })

  it('announces every page as a link, never as a button', () => {
    renderLinkPagination()
    const nav = screen.getByRole('navigation')

    expect(within(nav).queryAllByRole('button')).toHaveLength(0)
    for (const link of within(nav).getAllByRole('link')) {
      expect(link.tagName).toBe('A')
      expect(link).not.toHaveAttribute('role')
      expect(link).toHaveAttribute('href')
    }
  })

  it('marks only the current page with aria-current="page"', () => {
    renderLinkPagination()

    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: '1' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('labels previous and next in pt-BR', () => {
    renderLinkPagination()

    expect(
      screen.getByRole('link', { name: 'Ir para a página anterior' }),
    ).toHaveAttribute('href', '?page=1')
    expect(
      screen.getByRole('link', { name: 'Ir para a próxima página' }),
    ).toHaveAttribute('href', '?page=3')
    expect(screen.getByText('Anterior')).toBeInTheDocument()
    expect(screen.getByText('Próxima')).toBeInTheDocument()
  })
})

describe('<PaginationButton /> — client-state pages', () => {
  it('has no axe violations', async () => {
    const { container } = renderButtonPagination()

    await expectNoA11yViolations(container, { disabledRules: ['region'] })
  })

  it('renders real buttons, with no role override and no href', () => {
    renderButtonPagination()
    const nav = screen.getByRole('navigation')

    expect(within(nav).queryAllByRole('link')).toHaveLength(0)
    for (const button of within(nav).getAllByRole('button')) {
      expect(button.tagName).toBe('BUTTON')
      expect(button).toHaveAttribute('type', 'button')
      expect(button).not.toHaveAttribute('role')
    }
  })

  it('marks the current page and labels previous/next in pt-BR', async () => {
    const onPage = vi.fn()
    const { user } = renderButtonPagination(onPage)

    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByRole('button', { name: 'Ir para a página anterior' }),
    ).toBeDisabled()

    await user.click(
      screen.getByRole('button', { name: 'Ir para a próxima página' }),
    )
    expect(onPage).toHaveBeenCalledWith(2)
  })
})
