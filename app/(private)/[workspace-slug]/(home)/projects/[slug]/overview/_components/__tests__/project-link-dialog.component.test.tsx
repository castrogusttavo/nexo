import { screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectLinkDTO } from '@/types/project-link'
import { ProjectLinkDialog } from '../project-link-dialog'

// Real sonner attaches its own handlers to the tracked promise; the stub does
// the same so a rejected mutation never surfaces as an unhandled rejection.
vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn((promise: Promise<unknown>) => {
      void Promise.resolve(promise).catch(() => {})
    }),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

const BASE = '/api/workspaces/ws-1/projects/alpha/links'

const link: ProjectLinkDTO = {
  id: 'l1',
  projectId: 'p1',
  title: 'Site',
  url: 'https://nexopm.com',
  createdById: 'u1',
  createdAt: '2026-11-17T10:00:00.000Z',
}

function renderDialog(
  props: Partial<ComponentProps<typeof ProjectLinkDialog>> = {},
) {
  const onOpenChange = vi.fn()
  const utils = renderWithProviders(
    <ProjectLinkDialog
      workspaceId='ws-1'
      projectSlug='alpha'
      open
      onOpenChange={onOpenChange}
      {...props}
    />,
  )
  return { onOpenChange, ...utils }
}

// Base UI moves focus to the first field a moment after the popup opens;
// typing before that would land the first characters in the wrong input.
async function waitForInitialFocus() {
  await waitFor(() => expect(screen.getByLabelText('URL')).toHaveFocus())
}

describe('<ProjectLinkDialog /> creating', () => {
  it('starts empty with the submit button disabled', () => {
    renderDialog()

    expect(screen.getByText('Adicione o link')).toBeInTheDocument()
    expect(screen.getByLabelText('URL')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled()
  })

  it('POSTs the url and title, then closes', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(link, 201))
    const { user, onOpenChange } = renderDialog()
    await waitForInitialFocus()

    await user.type(screen.getByLabelText('URL'), 'https://nexopm.com')
    await user.type(screen.getByLabelText('Título'), 'Site')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE,
      method: 'POST',
      body: { url: 'https://nexopm.com', title: 'Site' },
    })
  })

  it('leaves the title out when it is blank and trims the url', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(link, 201))
    const { user } = renderDialog()
    await waitForInitialFocus()

    await user.type(screen.getByLabelText('URL'), '  https://a.com  ')
    await user.type(screen.getByLabelText('Título'), '   ')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy).body).toEqual({ url: 'https://a.com' })
  })

  it('blocks a non-http url and explains why', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderDialog()
    await waitForInitialFocus()

    await user.type(screen.getByLabelText('URL'), 'javascript:alert(1)')
    await user.tab()

    expect(
      screen.getByText('Use uma URL que comece com http:// ou https://'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('stays open when the server refuses the link', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiError(
        409,
        'Um projeto pode ter no máximo 20 links',
        'PROJECT_LINK_LIMIT_REACHED',
      ),
    )
    const { user, onOpenChange } = renderDialog()
    await waitForInitialFocus()

    await user.type(screen.getByLabelText('URL'), 'https://a.com')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled(),
    )
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('closes without a request when cancelled', async () => {
    const fetchSpy = mockFetch()
    const { user, onOpenChange } = renderDialog()
    await waitForInitialFocus()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('<ProjectLinkDialog /> editing', () => {
  it('pre-fills the fields of the link', () => {
    renderDialog({ link })

    expect(screen.getByText('Edite o link')).toBeInTheDocument()
    expect(screen.getByLabelText('URL')).toHaveValue('https://nexopm.com')
    expect(screen.getByLabelText('Título')).toHaveValue('Site')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  })

  it('PATCHes only the field that changed', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(link))
    const { user, onOpenChange } = renderDialog({ link })
    await waitForInitialFocus()

    await user.clear(screen.getByLabelText('Título'))
    await user.type(screen.getByLabelText('Título'), 'Novo título')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE}/l1`,
      method: 'PATCH',
      body: { title: 'Novo título' },
    })
  })

  it('sends null to clear the title', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(link))
    const { user } = renderDialog({ link })
    await waitForInitialFocus()

    await user.clear(screen.getByLabelText('Título'))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy).body).toEqual({ title: null })
  })

  it('sends the url alone when only the url changed', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(link))
    const { user } = renderDialog({ link })
    await waitForInitialFocus()

    await user.clear(screen.getByLabelText('URL'))
    await user.type(screen.getByLabelText('URL'), 'https://novo.com')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy).body).toEqual({ url: 'https://novo.com' })
  })

  it('just closes when nothing changed', async () => {
    const fetchSpy = mockFetch()
    const { user, onOpenChange } = renderDialog({ link })
    await waitForInitialFocus()

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
