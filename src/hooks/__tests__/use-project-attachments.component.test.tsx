import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectAttachmentDTO } from '@/types/project-attachment'
import {
  useProjectAttachments,
  useRemoveProjectAttachment,
  useUploadProjectAttachment,
} from '../use-project-attachments'

const BASE = '/api/workspaces/ws-1/projects/alpha/attachments'

const attachment: ProjectAttachmentDTO = {
  id: 'a1',
  projectId: 'p1',
  fileName: 'plano.pdf',
  contentType: 'application/pdf',
  size: 4,
  url: 'https://signed',
  uploadedById: 'u1',
  createdAt: '2026-11-17T10:00:00.000Z',
}

describe('project attachment hooks', () => {
  it('fetches the attachments', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess([attachment]))

    const { result } = renderHookWithProviders(() =>
      useProjectAttachments('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getFetchCall(fetchSpy)).toMatchObject({ url: BASE, method: 'GET' })
  })

  it('uploads the file as multipart form data under the "file" field', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(attachment, 201))
    const { result } = renderHookWithProviders(() =>
      useUploadProjectAttachment('ws-1', 'alpha'),
    )
    const file = new File(['%PDF'], 'plano.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.mutateAsync(file)
    })

    const call = getFetchCall(fetchSpy)
    expect(call).toMatchObject({ url: BASE, method: 'POST' })
    expect(call.body).toBeInstanceOf(FormData)
    const sent = (call.body as FormData).get('file') as File
    expect(sent.name).toBe('plano.pdf')
    expect(sent.type).toBe('application/pdf')
  })

  it('DELETEs an attachment and refetches the list', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(null))
    const { result } = renderHookWithProviders(() =>
      useRemoveProjectAttachment('ws-1', 'alpha'),
    )

    await act(async () => {
      await result.current.mutateAsync('a1')
    })

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE}/a1`,
      method: 'DELETE',
    })
  })
})
