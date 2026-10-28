import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { DependenciesPicker } from '../dependencies-picker'
import { RelationsPicker } from '../relations-picker'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const ISSUE_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues/i-1`

function mockLinks(path: 'relations' | 'dependencies', link: object) {
  return mockFetch().mockImplementation(async (input) => {
    if (String(input) === `${ISSUE_URL}/${path}`) return apiSuccess([link])
    return apiSuccess({ items: [], nextCursor: null })
  })
}

describe('issue link pickers', () => {
  it('labels the icon-only button that removes a relation', async () => {
    mockLinks('relations', {
      id: 'rel-1',
      sourceId: 'i-1',
      targetId: 'i-2',
      type: 'RELATES_TO',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    renderWithProviders(
      <RelationsPicker
        workspaceId={WORKSPACE_ID}
        projectSlug={PROJECT_SLUG}
        issueId='i-1'
      />,
    )

    expect(
      await screen.findByRole('button', { name: 'Remover relação' }),
    ).toBeInTheDocument()
  })

  it('labels the icon-only button that removes a dependency', async () => {
    mockLinks('dependencies', {
      id: 'dep-1',
      sourceId: 'i-1',
      targetId: 'i-2',
      type: 'BLOCKS',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    renderWithProviders(
      <DependenciesPicker
        workspaceId={WORKSPACE_ID}
        projectSlug={PROJECT_SLUG}
        issueId='i-1'
      />,
    )

    expect(
      await screen.findByRole('button', { name: 'Remover dependência' }),
    ).toBeInTheDocument()
  })
})
