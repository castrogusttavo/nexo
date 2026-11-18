import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectReactionSummaryDTO } from '@/types/project-reaction'
import { ProjectReactionList } from '../project-reaction-list'

const BASE = '/api/workspaces/ws-1/projects/alpha/reactions'

const reactions: ProjectReactionSummaryDTO[] = [
  { emoji: '👍', count: 3, reactedByMe: true },
  { emoji: '🔥', count: 1, reactedByMe: false },
]

function render() {
  return renderWithProviders(
    <ProjectReactionList workspaceId='ws-1' projectSlug='alpha' />,
  )
}

describe('ProjectReactionList', () => {
  it('shows a count chip per emoji, marking the ones I reacted to', async () => {
    mockFetch().mockImplementation(async () => apiSuccess(reactions))

    render()

    const mine = await screen.findByRole('button', { name: '👍 3' })
    expect(mine).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '🔥 1' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Reagir' })).toBeInTheDocument()
  })

  it('PUTs when I click a chip I had not reacted to', async () => {
    const fetchSpy = mockFetch().mockImplementation(async () =>
      apiSuccess(reactions),
    )
    const { user } = render()

    await user.click(await screen.findByRole('button', { name: '🔥 1' }))

    await waitFor(() =>
      expect(getFetchCall(fetchSpy, 1)).toMatchObject({
        url: `${BASE}/${encodeURIComponent('🔥')}`,
        method: 'PUT',
      }),
    )
  })

  it('DELETEs when I click a chip I had reacted to', async () => {
    const fetchSpy = mockFetch().mockImplementation(async () =>
      apiSuccess(reactions),
    )
    const { user } = render()

    await user.click(await screen.findByRole('button', { name: '👍 3' }))

    await waitFor(() =>
      expect(getFetchCall(fetchSpy, 1)).toMatchObject({
        url: `${BASE}/${encodeURIComponent('👍')}`,
        method: 'DELETE',
      }),
    )
  })

  it('rolls the chip back when the server refuses the reaction', async () => {
    mockFetch().mockImplementation(async (_url, init) =>
      init?.method === 'PUT'
        ? apiError(403, 'Visualizadores não podem reagir', 'PROJECT_FORBIDDEN')
        : apiSuccess(reactions),
    )
    const { user } = render()

    await user.click(await screen.findByRole('button', { name: '🔥 1' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '🔥 1' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
  })
})
