import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { WebFaqSection } from '../web-faq-section'

const ITEMS = [
  { question: 'Primeira pergunta?', answer: 'Primeira resposta.' },
  { question: 'Segunda pergunta?', answer: 'Segunda resposta.' },
]

function renderFaq() {
  return renderWithProviders(
    <WebFaqSection
      title='Perguntas frequentes'
      subtitle='Fale com a gente.'
      items={ITEMS}
    />,
  )
}

describe('<WebFaqSection />', () => {
  it('heads the section and lists every question', () => {
    renderFaq()

    expect(
      screen.getByRole('heading', { level: 2, name: 'Perguntas frequentes' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Fale com a gente.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Primeira pergunta?' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Segunda pergunta?' }),
    ).toBeInTheDocument()
  })

  it('opens the first answer and keeps one answer open', async () => {
    const { user } = renderFaq()
    const first = screen.getByRole('button', { name: 'Primeira pergunta?' })
    expect(first).toHaveAttribute('aria-expanded', 'true')

    await user.click(first)

    expect(first).toHaveAttribute('aria-expanded', 'true')
  })

  it('publishes the same questions as FAQPage structured data', () => {
    const { container } = renderFaq()

    const script = container.querySelector('script[type="application/ld+json"]')
    const data = JSON.parse(script?.textContent ?? '{}')
    expect(data['@type']).toBe('FAQPage')
    expect(data.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'Primeira pergunta?',
        acceptedAnswer: { '@type': 'Answer', text: 'Primeira resposta.' },
      },
      {
        '@type': 'Question',
        name: 'Segunda pergunta?',
        acceptedAnswer: { '@type': 'Answer', text: 'Segunda resposta.' },
      },
    ])
  })
})
