import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProjectDTO } from '@/src/__tests__/factories/dto/project.dto'
import { buildProjectLabelDTO } from '@/src/__tests__/factories/dto/project-label.dto'
import { buildDefaultProjectStateDTOs } from '@/src/__tests__/factories/dto/project-state.dto'
import {
  apiError,
  apiSuccess,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import {
  requests,
  routeFetch,
  toastOutcome,
} from '@/src/__tests__/helpers/route-fetch'
import type { MemberDTO } from '@/types/member'
import type { ProjectDTO, ProjectMemberDTO } from '@/types/project'
import { ProjectDetailsProperties } from '../project-details-properties'

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

const WS = '/api/workspaces/ws-1'
const PROJECT_URL = `${WS}/projects/alpha`
const MEMBERS_URL = `${PROJECT_URL}/members`
const WORKSPACE_MEMBERS_URL = `${WS}/members?sortBy=name&sortOrder=asc&page=1&pageSize=100`

const STATES = buildDefaultProjectStateDTOs()

function projectMember(
  userId: string,
  name: string,
  username: string,
  isLead = false,
): ProjectMemberDTO {
  return {
    userId,
    name,
    username,
    image: null,
    email: `${username}@nexo.dev`,
    isLead,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function workspaceMember(userId: string, name: string, username: string) {
  return {
    membershipId: `m-${userId}`,
    userId,
    name,
    username,
    email: `${username}@nexo.dev`,
    image: null,
    role: 'MEMBER',
    accountStatus: 'ACTIVE',
    authMethods: ['EMAIL_PASSWORD'],
    twoFactorEnabled: false,
    joinedAt: '2026-01-01T00:00:00.000Z',
  } satisfies MemberDTO
}

const ANA = projectMember('user-1', 'Ana Souza', 'ana', true)
const BRUNO = projectMember('user-2', 'Bruno Lima', 'bruno')
const CARLA = workspaceMember('user-3', 'Carla Dias', 'carla')

const LABELS = [
  buildProjectLabelDTO({ id: 'plabel-1', name: 'Marketing' }),
  buildProjectLabelDTO({ id: 'plabel-2', name: 'Q4', color: 'GREEN' }),
]

interface Setup {
  project?: Partial<ProjectDTO>
  projectMembers?: ProjectMemberDTO[]
  canManage?: boolean
  extra?: Parameters<typeof routeFetch>[0]
}

function setup({
  project = {},
  projectMembers = [ANA, BRUNO],
  canManage = true,
  extra = {},
}: Setup = {}) {
  const current = buildProjectDTO({ slug: 'alpha', ...project })
  const spy = routeFetch({
    [`GET ${PROJECT_URL}`]: () => apiSuccess(current),
    [`GET ${WS}/project-states`]: () => apiSuccess(STATES),
    [`GET ${MEMBERS_URL}`]: () => apiSuccess(projectMembers),
    [`GET ${WORKSPACE_MEMBERS_URL}`]: () =>
      apiSuccess({
        members: [
          workspaceMember(ANA.userId, ANA.name, ANA.username),
          workspaceMember(BRUNO.userId, BRUNO.name, BRUNO.username),
          CARLA,
        ],
        total: 3,
        page: 1,
        pageSize: 100,
      }),
    [`GET ${WS}/project-labels`]: () => apiSuccess(LABELS),
    [`PATCH ${PROJECT_URL}`]: () => apiSuccess(current),
    ...extra,
  })
  const view = renderWithProviders(
    <ProjectDetailsProperties
      workspaceId='ws-1'
      projectSlug='alpha'
      canManage={canManage}
    />,
  )
  return { ...view, spy }
}

const patches = (spy: ReturnType<typeof routeFetch>) =>
  requests(spy).filter((r) => r.method === 'PATCH')

async function ready() {
  await screen.findByText('Propriedades')
  // the state is the last value to arrive: it needs the states query too
  await screen.findByRole('button', { name: /Rascunho/ })
}

beforeEach(() => {
  vi.mocked(toast.promise).mockReset()
})

describe('<ProjectDetailsProperties /> loading', () => {
  it('renders nothing until the project is there', async () => {
    setup()

    expect(screen.queryByText('Propriedades')).not.toBeInTheDocument()
    expect(await screen.findByText('Propriedades')).toBeInTheDocument()
  })

  it('asks for the project it was given, not another', async () => {
    const { spy } = setup()
    await ready()

    expect(requests(spy)[0]).toMatchObject({
      method: 'GET',
      url: PROJECT_URL,
    })
  })

  it('lists every property', async () => {
    setup()
    await ready()

    for (const label of [
      'Estado',
      'Prioridade',
      'Líder',
      'Membros',
      'Etiquetas',
      'Data de início',
      'Data de conclusão',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('shows the current value of each one', async () => {
    setup({
      project: {
        priority: 'HIGH',
        labelIds: ['plabel-1', 'plabel-2'],
        leadId: 'user-1',
      },
    })
    await ready()

    expect(screen.getByRole('button', { name: 'Alta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /@ana/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '2 etiquetas' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Sem data' })).toHaveLength(2)
  })

  it('says so when there is no lead, no label and no date', async () => {
    setup({ project: { leadId: null, labelIds: [] } })
    await ready()

    expect(
      screen.getByRole('button', { name: 'Sem líder' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sem etiquetas' }),
    ).toBeInTheDocument()
  })

  it('uses the singular for a single label', async () => {
    setup({ project: { labelIds: ['plabel-1'] } })
    await ready()

    expect(
      screen.getByRole('button', { name: '1 etiqueta' }),
    ).toBeInTheDocument()
  })
})

describe('<ProjectDetailsProperties /> state', () => {
  it('searches the states and PATCHes the chosen one', async () => {
    const { user, spy } = setup()
    await ready()

    await user.click(screen.getByRole('button', { name: /Rascunho/ }))
    await user.type(screen.getByPlaceholderText('Procurar estado...'), 'moni')
    expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()
    await user.click(await screen.findByText('Monitoramento'))

    await waitFor(() => expect(patches(spy)).toHaveLength(1))
    expect(patches(spy)[0]).toEqual({
      url: PROJECT_URL,
      method: 'PATCH',
      body: { stateId: 'pstate-4' },
    })
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Estado atualizado',
    })
  })

  it('tells the user when the API refuses the change', async () => {
    const { user } = setup({
      extra: {
        [`PATCH ${PROJECT_URL}`]: () =>
          apiError(409, 'Os estados de projeto estão desativados'),
      },
    })
    await ready()

    await user.click(screen.getByRole('button', { name: /Rascunho/ }))
    await user.click(await screen.findByText('Execução'))

    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'error',
      message: 'Os estados de projeto estão desativados',
    })
  })
})

describe('<ProjectDetailsProperties /> priority', () => {
  it('is a plain menu: it has no search field', async () => {
    const { user } = setup()
    await ready()

    await user.click(screen.getByRole('button', { name: 'Nenhum' }))

    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Procurar|Pesquisar/)).toBeNull()
  })

  it('offers the five priorities and marks the current one', async () => {
    const { user } = setup({ project: { priority: 'MEDIUM' } })
    await ready()

    await user.click(screen.getByRole('button', { name: 'Média' }))
    const menu = within(await screen.findByRole('menu'))

    for (const name of ['Nenhum', 'Baixa', 'Média', 'Alta', 'Urgente']) {
      expect(menu.getByRole('menuitemradio', { name })).toBeInTheDocument()
    }
    expect(menu.getByRole('menuitemradio', { name: 'Média' })).toBeChecked()
  })

  it('PATCHes the priority it is given', async () => {
    const { user, spy } = setup()
    await ready()

    await user.click(screen.getByRole('button', { name: 'Nenhum' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Alta' }))

    await waitFor(() => expect(patches(spy)).toHaveLength(1))
    expect(patches(spy)[0].body).toEqual({ priority: 'HIGH' })
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Prioridade atualizada',
    })
  })
})

describe('<ProjectDetailsProperties /> lead', () => {
  it('searches the project members and PATCHes the new lead', async () => {
    const { user, spy } = setup()
    await ready()

    await user.click(screen.getByRole('button', { name: /@ana/ }))
    await user.type(screen.getByPlaceholderText('Procurar membro...'), 'bru')
    // the trigger still reads "@ana": look at the options, not the page
    expect(screen.queryByRole('option', { name: /@ana/ })).toBeNull()
    await user.click(await screen.findByRole('option', { name: /@bruno/ }))

    await waitFor(() => expect(patches(spy)).toHaveLength(1))
    expect(patches(spy)[0].body).toEqual({ leadId: 'user-2' })
  })

  it('does nothing when the current lead is picked again', async () => {
    const { user, spy } = setup()
    await ready()

    await user.click(screen.getByRole('button', { name: /@ana/ }))
    await user.click(await screen.findByText('@ana', { selector: 'span' }))

    expect(patches(spy)).toHaveLength(0)
  })
})

const membersTrigger = () =>
  screen.getByRole('button', { name: 'Membros do projeto' })

describe('<ProjectDetailsProperties /> members', () => {
  it('shows who is on the project', async () => {
    setup()
    await ready()

    expect(membersTrigger()).toBeEnabled()
    // two people fit in the avatar group: no "+N"
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument()
  })

  it('counts the people beyond the three avatars', async () => {
    setup({
      projectMembers: [
        ANA,
        BRUNO,
        projectMember('user-4', 'Davi', 'davi'),
        projectMember('user-5', 'Eva', 'eva'),
        projectMember('user-6', 'Fabio', 'fabio'),
      ],
    })
    await ready()

    expect(await screen.findByText('+2')).toBeInTheDocument()
  })

  it('shows the workspace members as options, marking those on the project', async () => {
    const { user } = setup()
    await ready()

    await user.click(membersTrigger())

    expect(await screen.findByText('Carla Dias')).toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
  })

  it('adds a workspace member with a POST', async () => {
    const { user, spy } = setup({
      extra: {
        [`POST ${MEMBERS_URL}`]: () =>
          apiSuccess(projectMember('user-3', 'Carla Dias', 'carla'), 201),
      },
    })
    await ready()

    await user.click(membersTrigger())
    await user.click(await screen.findByText('Carla Dias'))

    await waitFor(() =>
      expect(requests(spy).filter((r) => r.method === 'POST')).toEqual([
        { url: MEMBERS_URL, method: 'POST', body: { userId: 'user-3' } },
      ]),
    )
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Membros atualizados',
    })
  })

  it('removes a member with a DELETE', async () => {
    const { user, spy } = setup({
      extra: {
        [`DELETE ${MEMBERS_URL}/user-2`]: () => apiSuccess(null),
      },
    })
    await ready()

    await user.click(membersTrigger())
    await user.click(await screen.findByText('Bruno Lima'))

    await waitFor(() =>
      expect(requests(spy).filter((r) => r.method === 'DELETE')).toHaveLength(
        1,
      ),
    )
    expect(requests(spy).find((r) => r.method === 'DELETE')?.url).toBe(
      `${MEMBERS_URL}/user-2`,
    )
  })

  it('never tries to remove the lead, who the API would refuse', async () => {
    const { user, spy } = setup()
    await ready()

    await user.click(membersTrigger())
    await user.click(await screen.findByText('Ana Souza'))

    // nothing to add and nothing it may remove: no request at all
    expect(
      requests(spy).filter((r) => r.method === 'DELETE' || r.method === 'POST'),
    ).toHaveLength(0)
    expect(toast.promise).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when a change is refused', async () => {
    const { user } = setup({
      extra: {
        [`POST ${MEMBERS_URL}`]: () =>
          apiError(403, 'Sem permissão para gerenciar membros'),
      },
    })
    await ready()

    await user.click(membersTrigger())
    await user.click(await screen.findByText('Carla Dias'))

    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'error',
      message: 'Sem permissão para gerenciar membros',
    })
  })
})

describe('<ProjectDetailsProperties /> labels', () => {
  it('searches the labels', async () => {
    const { user } = setup()
    await ready()

    await user.click(screen.getByRole('button', { name: 'Sem etiquetas' }))
    await user.type(screen.getByPlaceholderText('Procurar etiqueta...'), 'q4')

    expect(await screen.findByText('Q4')).toBeInTheDocument()
    expect(screen.queryByText('Marketing')).not.toBeInTheDocument()
  })

  it('PATCHes the whole new set when a label is added', async () => {
    const { user, spy } = setup({ project: { labelIds: ['plabel-1'] } })
    await ready()

    await user.click(screen.getByRole('button', { name: '1 etiqueta' }))
    await user.click(await screen.findByText('Q4'))

    await waitFor(() => expect(patches(spy)).toHaveLength(1))
    expect(patches(spy)[0].body).toEqual({
      labelIds: ['plabel-1', 'plabel-2'],
    })
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Etiquetas atualizadas',
    })
  })

  it('PATCHes an empty set when the last label is removed', async () => {
    const { user, spy } = setup({ project: { labelIds: ['plabel-1'] } })
    await ready()

    await user.click(screen.getByRole('button', { name: '1 etiqueta' }))
    await user.click(await screen.findByText('Marketing'))

    await waitFor(() => expect(patches(spy)).toHaveLength(1))
    expect(patches(spy)[0].body).toEqual({ labelIds: [] })
  })
})

describe('<ProjectDetailsProperties /> dates', () => {
  it('PATCHes the start date as the day the user clicked', async () => {
    const { user, spy } = setup()
    await ready()

    await user.click(screen.getAllByRole('button', { name: 'Sem data' })[0])
    await user.click(
      await screen.findByRole('button', { name: /\b15(st|nd|rd|th)\b/ }),
    )

    await waitFor(() => expect(patches(spy)).toHaveLength(1))
    expect(patches(spy)[0].body).toEqual({
      startDate: expect.stringMatching(/^\d{4}-\d{2}-15T00:00:00\.000Z$/),
    })
  })

  it('PATCHes the due date on its own field', async () => {
    const { user, spy } = setup()
    await ready()

    await user.click(screen.getAllByRole('button', { name: 'Sem data' })[1])
    await user.click(
      await screen.findByRole('button', { name: /\b15(st|nd|rd|th)\b/ }),
    )

    await waitFor(() => expect(patches(spy)).toHaveLength(1))
    expect(Object.keys(patches(spy)[0].body as object)).toEqual(['dueDate'])
  })

  it('shows a date that is already set', async () => {
    setup({ project: { startDate: '2026-03-10T00:00:00.000Z' } })
    await ready()

    expect(screen.getAllByRole('button', { name: 'Sem data' })).toHaveLength(1)
  })
})

describe('<ProjectDetailsProperties /> without permission', () => {
  it('locks every control, and requests nothing', async () => {
    const { user, spy } = setup({ canManage: false })
    await ready()

    for (const control of [
      screen.getByRole('button', { name: /Rascunho/ }),
      screen.getByRole('button', { name: 'Nenhum' }),
      screen.getByRole('button', { name: /@ana/ }),
      membersTrigger(),
      screen.getByRole('button', { name: 'Sem etiquetas' }),
      ...screen.getAllByRole('button', { name: 'Sem data' }),
    ]) {
      expect(control).toBeDisabled()
      await user.click(control)
    }

    expect(patches(spy)).toHaveLength(0)
  })
})
