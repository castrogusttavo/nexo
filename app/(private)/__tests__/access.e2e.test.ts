import { createId } from '@paralleldrive/cuid2'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultProjectStateId } from '@/src/__tests__/factories/project-state.factory'
import {
  authenticatedOwner,
  createAuthenticatedUser,
  createWorkspaceForUser,
  withoutSessionCache,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

// Who may see a workspace's pages, checked from the outside. Each page is
// asked for by people who must not see it, and the answer must route them
// away without the workspace's data in the HTML. The assertions accept a
// redirect or a 404 both as an HTTP status (a blocking gate) and streamed
// into the document (a gate behind <Suspense>), so they hold before and after
// the private layouts stop blocking.

type Visit = { status: number; location: string | null; body: string }

async function visit(path: string, cookie?: string): Promise<Visit> {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: 'manual',
    headers: cookie ? { Cookie: cookie } : {},
  })
  const location = res.headers.get('location')
  return {
    status: res.status,
    location: location ? new URL(location, BASE_URL).pathname : null,
    body: await res.text(),
  }
}

function expectRedirect(page: Visit, path: string) {
  if (page.status === 307) {
    expect(page.location).toBe(path)
    return
  }
  // Redirected after the shell was sent: Next streams a meta refresh.
  expect(page.status).toBe(200)
  expect(page.body).toContain(`url=${path}`)
}

function expectNotFound(page: Visit) {
  if (page.status === 404) return
  expect(page.status).toBe(200)
  expect(page.body).toContain('NEXT_HTTP_ERROR_FALLBACK;404')
}

// Nine pages per test; under `next dev` each compiles on its first visit.
const ALL_PAGES = { timeout: 120_000 }

let slug: string
let secrets: string[]
let pages: string[]

// The suite truncates every table after each test, so each one seeds its own.
beforeEach(async () => {
  const tag = createId().slice(0, 8)
  const { user, workspace } = await authenticatedOwner()
  const project = await prisma.project.create({
    data: {
      name: `Projeto secreto ${tag}`,
      slug: `segredo-${tag}`,
      identifier: tag.slice(0, 6).toUpperCase(),
      workspaceId: workspace.id,
      leadId: user.id,
      stateId: await defaultProjectStateId(workspace.id),
    },
  })

  slug = workspace.slug
  // The workspace id reaches the client as a prop on most pages; the project
  // name is rendered by the project layout.
  secrets = [workspace.id, project.name]
  const base = `/${slug}`
  const projectBase = `${base}/projects/${project.slug}`
  pages = [
    base,
    `${base}/projects`,
    `${base}/archives`,
    `${base}/wiki`,
    `${base}/settings/members`,
    `${base}/settings/billing`,
    `${projectBase}/issues`,
    `${projectBase}/settings`,
    `${projectBase}/settings/labels`,
  ]
})

function expectNoSecrets(page: Visit) {
  for (const secret of secrets) expect(page.body).not.toContain(secret)
}

describe('private pages - anonymous visitor', () => {
  it('sends every page to /sign-in', ALL_PAGES, async () => {
    for (const path of pages) {
      const page = await visit(path)
      expect(page.status, path).toBe(307)
      expect(page.location, path).toBe('/sign-in')
      expectNoSecrets(page)
    }
  })
})

describe('private pages - signed in, not a member', () => {
  it('answers 404 without the workspace data', ALL_PAGES, async () => {
    const stranger = await createAuthenticatedUser()
    await createWorkspaceForUser(stranger.id)
    // Done with onboarding, so the membership check is what answers.
    await prisma.user.update({
      where: { id: stranger.id },
      data: { onboardingStep: null },
    })

    for (const path of pages) {
      const page = await visit(path, stranger.cookie)
      expectNotFound(page)
      expectNoSecrets(page)
    }
  })
})

describe('private pages - member without consent (STR-61)', () => {
  async function unconsentedMember() {
    const member = await createAuthenticatedUser({ skipConsent: true })
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { slug },
    })
    await prisma.membership.create({
      data: { userId: member.id, workspaceId: workspace.id, role: 'MEMBER' },
    })
    return member
  }

  it(
    'is sent to the consent step by the proxy (cookie cache)',
    ALL_PAGES,
    async () => {
      const member = await unconsentedMember()

      for (const path of pages) {
        const page = await visit(path, member.browserCookie)
        expect(page.status, path).toBe(307)
        expect(page.location, path).toBe('/onboarding/consent-setup')
      }
    },
  )

  it(
    'is sent to the consent step without the data when the proxy cannot tell',
    ALL_PAGES,
    async () => {
      const member = await unconsentedMember()
      const cookie = withoutSessionCache(member.browserCookie)

      for (const path of pages) {
        const page = await visit(path, cookie)
        expectRedirect(page, '/onboarding/consent-setup')
        expectNoSecrets(page)
      }
    },
  )
})
