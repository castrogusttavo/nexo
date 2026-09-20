import { screen } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import { beforeEach, describe, it, vi } from 'vitest'
import { Tabs } from '@/components/ui/tabs'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import {
  createTestQueryClient,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UserDTO } from '@/types/user'
import { UserModalProfileTab } from '../user-modal-profile-tab'

const { useSession, refetch, signOut } = vi.hoisted(() => ({
  useSession: vi.fn(),
  refetch: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession, signOut },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

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

// next/image needs the Next runtime loader; a plain <img> is enough here.
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

// The cover picker has its own upload flow; out of scope here.
vi.mock('../../user-modal-coverimage-dialog', () => ({
  UserCoverImagePicker: () => null,
}))

// The tab renders inside the account modal, which owns the dialog landmark
// and the heading structure.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

const USER: UserDTO = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  username: 'ana',
  emailVerified: true,
  image: null,
  coverImage: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  deletionScheduledAt: null,
  acceptedTermsAt: null,
  acceptedPrivacyAt: null,
  onboardingStep: null,
  role: null,
  goals: [],
  memberships: [],
}

function renderTab(user: UserDTO = USER) {
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(['user', user.id], user)
  return renderWithProviders(
    <Tabs value='profile'>
      <UserModalProfileTab tab='profile' />
    </Tabs>,
    { queryClient },
  )
}

beforeEach(() => {
  refetch.mockReset().mockResolvedValue(undefined)
  signOut.mockReset().mockResolvedValue(undefined)
  useSession.mockReturnValue({ data: { user: { id: USER.id } }, refetch })
})

describe('<UserModalProfileTab /> accessibility', () => {
  it('has no violations with the profile loaded', async () => {
    const { container } = renderTab()

    await screen.findByLabelText(/Nome completo/)

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations for an account scheduled for deletion', async () => {
    const { container } = renderTab({
      ...USER,
      deletionScheduledAt: '2026-06-01T00:00:00.000Z',
    })

    await screen.findByLabelText(/Nome completo/)

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
