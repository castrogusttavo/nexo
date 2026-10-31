import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildProjectDTO } from '@/src/__tests__/factories/dto/project.dto'
import { buildDefaultProjectStateDTOs } from '@/src/__tests__/factories/dto/project-state.dto'
import {
  apiSuccess,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { requests, routeFetch } from '@/src/__tests__/helpers/route-fetch'
import { ProjectDetails } from '../project-details'

const WS = '/api/workspaces/ws-1'

describe('<ProjectDetails />', () => {
  it('hands the workspace and project to the properties tab', async () => {
    const spy = routeFetch({
      [`GET ${WS}/projects/alpha`]: () =>
        apiSuccess(buildProjectDTO({ slug: 'alpha' })),
      [`GET ${WS}/project-states`]: () =>
        apiSuccess(buildDefaultProjectStateDTOs()),
      [`GET ${WS}/projects/alpha/members`]: () => apiSuccess([]),
      [`GET ${WS}/members?sortBy=name&sortOrder=asc&page=1&pageSize=100`]: () =>
        apiSuccess({ members: [], total: 0, page: 1, pageSize: 100 }),
      [`GET ${WS}/project-labels`]: () => apiSuccess([]),
    })

    renderWithProviders(
      <ProjectDetails open workspaceId='ws-1' projectSlug='alpha' canManage />,
    )

    // The tab used to come up empty when these never reached it.
    expect(await screen.findByText('Propriedades')).toBeInTheDocument()
    expect(requests(spy)[0].url).toBe(`${WS}/projects/alpha`)
  })

  it('names its three tabs', async () => {
    routeFetch({
      [`GET ${WS}/projects/alpha`]: () => apiSuccess(buildProjectDTO()),
      [`GET ${WS}/project-states`]: () => apiSuccess([]),
      [`GET ${WS}/projects/alpha/members`]: () => apiSuccess([]),
      [`GET ${WS}/members?sortBy=name&sortOrder=asc&page=1&pageSize=100`]: () =>
        apiSuccess({ members: [], total: 0, page: 1, pageSize: 100 }),
      [`GET ${WS}/project-labels`]: () => apiSuccess([]),
    })

    renderWithProviders(
      <ProjectDetails open workspaceId='ws-1' projectSlug='alpha' canManage />,
    )

    for (const name of ['Propriedades', 'Atualizações', 'Atividade']) {
      expect(await screen.findByRole('tab', { name })).toBeInTheDocument()
    }
  })
})
