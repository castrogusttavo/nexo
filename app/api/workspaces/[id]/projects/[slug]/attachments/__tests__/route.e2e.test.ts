import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  getJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

const base = (ws: string, slug: string) =>
  `/api/workspaces/${ws}/projects/${slug}/attachments`

function upload(
  path: string,
  file: { name: string; type: string; bytes: Uint8Array },
  cookie?: string,
) {
  const form = new FormData()
  form.append(
    'file',
    new File([file.bytes as BlobPart], file.name, { type: file.type }),
  )

  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Origin: BASE_URL, ...(cookie ? { Cookie: cookie } : {}) },
    body: form,
    redirect: 'manual',
  })
}

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46])

describe('/api/workspaces/[id]/projects/[slug]/attachments', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await upload(base('ws', 's'), {
      name: 'a.pdf',
      type: 'application/pdf',
      bytes: PDF,
    })

    expect(res.status).toBe(401)
  })

  it('should upload, list and delete an attachment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const url = base(workspace.id, project.slug)

    const created = await upload(
      url,
      { name: 'plano.pdf', type: 'application/pdf', bytes: PDF },
      user.cookie,
    )
    expect(created.status).toBe(201)
    const attachment = (await created.json()).data
    expect(attachment.fileName).toBe('plano.pdf')
    expect(attachment.url).toContain('http')
    expect(attachment).not.toHaveProperty('key')

    const list = (await (await getJson(url, user.cookie)).json()).data
    expect(list).toHaveLength(1)

    expect(
      (await deleteJson(`${url}/${attachment.id}`, user.cookie)).status,
    ).toBe(200)
    expect((await (await getJson(url, user.cookie)).json()).data).toEqual([])
  })

  it('should return 422 for a disallowed file type', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await upload(
      base(workspace.id, project.slug),
      { name: 'x.exe', type: 'application/x-msdownload', bytes: PDF },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should return 403 on upload for a workspace member who is not the lead', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await upload(
      base(workspace.id, project.slug),
      { name: 'a.pdf', type: 'application/pdf', bytes: PDF },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })
})
