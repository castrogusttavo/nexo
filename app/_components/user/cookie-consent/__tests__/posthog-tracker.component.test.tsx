import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { COOKIE_NAME, type CookieConsent } from '@/lib/cookie-consent/types'
import {
  captureEvent,
  POSTHOG_OPTIONS,
  resetPostHogForTests,
} from '@/lib/posthog/client'
import { ConsentedTrackers } from '../consented-trackers'
import { PostHogTracker } from '../posthog-tracker'
import { CookieConsentProvider } from '../provider'

// `sdk.imports` counts how many times the `posthog-js` module itself was
// evaluated. Vitest runs a `vi.mock` factory lazily, on the first import, so
// a count of 0 is proof that the chunk was never even fetched — which is the
// contract for "no key" and for "consent refused", not just "nothing was
// sent".
const sdk = vi.hoisted(() => ({
  imports: 0,
  init: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
  distinctId: 'anon-0001',
  identified: false,
}))

vi.mock('posthog-js', () => {
  sdk.imports++
  const posthog = {
    init: sdk.init,
    identify: sdk.identify,
    reset: sdk.reset,
    capture: sdk.capture,
    get_distinct_id: () => sdk.distinctId,
    _isIdentified: () => sdk.identified,
  }
  return { posthog, default: posthog }
})

const env = vi.hoisted(() => ({ key: undefined as string | undefined }))

vi.mock('@/lib/env/env', () => ({
  get NEXT_PUBLIC_POSTHOG_KEY() {
    return env.key
  },
  NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
  NODE_ENV: 'test',
}))

vi.mock('@/lib/axiom/client', () => ({ WebVitals: () => null }))

beforeEach(() => {
  sdk.imports = 0
  sdk.init.mockClear()
  sdk.identify.mockClear()
  sdk.reset.mockClear()
  sdk.capture.mockClear()
  sdk.distinctId = 'anon-0001'
  sdk.identified = false
  env.key = undefined
  resetPostHogForTests()
})

/** The tracker as the app mounts it: behind the consent gate. */
function renderBehindConsent(consent: CookieConsent, userId: string | null) {
  return render(
    <CookieConsentProvider
      initial={consent}
      isAuthenticated={userId !== null}
      userId={userId}
    >
      <ConsentedTrackers />
    </CookieConsentProvider>,
  )
}

/**
 * Flushes the effect and the microtask chain behind `loadPostHog()`, so an
 * assertion that nothing happened is an assertion about a settled state
 * rather than about a race.
 */
async function settle(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 5; index++) await Promise.resolve()
  })
}

describe('<PostHogTracker /> loading gates', () => {
  it('never loads the SDK when no key is configured', async () => {
    renderBehindConsent('accepted', 'usr_1')
    await settle()
    expect(sdk.imports).toBe(0)
    expect(sdk.init).not.toHaveBeenCalled()
  })

  it('never loads the SDK when the visitor refused analytics cookies', async () => {
    env.key = 'phc_test'
    renderBehindConsent('rejected', 'usr_1')
    await settle()
    expect(sdk.imports).toBe(0)
    expect(sdk.init).not.toHaveBeenCalled()
  })

  it('never loads the SDK while the decision is still pending', async () => {
    env.key = 'phc_test'
    renderBehindConsent(null, 'usr_1')
    await settle()
    expect(sdk.imports).toBe(0)
    expect(sdk.init).not.toHaveBeenCalled()
  })

  it('initialises once when the key is set and consent was given', async () => {
    env.key = 'phc_test'
    renderBehindConsent('accepted', null)
    await waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(1))
    expect(sdk.init).toHaveBeenCalledWith('phc_test', POSTHOG_OPTIONS)
  })

  it('initialises only once across re-mounts', async () => {
    env.key = 'phc_test'
    const first = renderBehindConsent('accepted', null)
    await waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(1))
    first.unmount()
    renderBehindConsent('accepted', null)
    await settle()
    expect(sdk.init).toHaveBeenCalledTimes(1)
  })
})

describe('<PostHogTracker /> identity', () => {
  it('identifies the signed-in user by id, with no other property', async () => {
    env.key = 'phc_test'
    renderBehindConsent('accepted', 'usr_123')
    await waitFor(() => expect(sdk.identify).toHaveBeenCalledTimes(1))
    expect(sdk.identify).toHaveBeenCalledWith('usr_123')
    // No name, no e-mail, no property bag of any kind.
    expect(sdk.identify.mock.calls[0]).toHaveLength(1)
  })

  it('does not re-identify a user PostHog already knows', async () => {
    env.key = 'phc_test'
    sdk.distinctId = 'usr_123'
    renderBehindConsent('accepted', 'usr_123')
    await settle()
    await waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(1))
    expect(sdk.identify).not.toHaveBeenCalled()
  })

  it('never identifies an anonymous visitor', async () => {
    env.key = 'phc_test'
    renderBehindConsent('accepted', null)
    await waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(1))
    expect(sdk.identify).not.toHaveBeenCalled()
    expect(sdk.reset).not.toHaveBeenCalled()
  })

  it('resets the stored identity when an identified user signs out', async () => {
    env.key = 'phc_test'
    sdk.distinctId = 'usr_123'
    sdk.identified = true
    render(<PostHogTracker userId={null} />)
    await waitFor(() => expect(sdk.reset).toHaveBeenCalledTimes(1))
  })
})

describe('PostHog configuration', () => {
  it('collects page views and named events only', () => {
    expect(POSTHOG_OPTIONS.autocapture).toBe(false)
    expect(POSTHOG_OPTIONS.capture_pageview).toBe('history_change')
    expect(POSTHOG_OPTIONS.capture_dead_clicks).toBe(false)
    expect(POSTHOG_OPTIONS.capture_heatmaps).toBe(false)
    expect(POSTHOG_OPTIONS.rageclick).toBe(false)
  })

  // Regression guard: `respect_dnt: true` made posthog-js drop every event from
  // a browser sending DNT or GPC — Firefox "Strict", Brave, any private window —
  // even after the visitor accepted our banner, with no log and no request. The
  // consent banner is the gate; a browser-level signal aimed at ad-tech "sale
  // or sharing" is not a second one.
  it('does not let a browser privacy signal override the banner', () => {
    expect(POSTHOG_OPTIONS.respect_dnt).toBe(false)
  })

  it('records nothing the user types or sees', () => {
    expect(POSTHOG_OPTIONS.disable_session_recording).toBe(true)
    expect(POSTHOG_OPTIONS.mask_all_text).toBe(true)
    expect(POSTHOG_OPTIONS.mask_all_element_attributes).toBe(true)
    expect(POSTHOG_OPTIONS.person_profiles).toBe('identified_only')
    expect(POSTHOG_OPTIONS.property_denylist).toContain('$ip')
  })

  it('leaves error tracking to Sentry and scripts to our own origin', () => {
    expect(POSTHOG_OPTIONS.capture_exceptions).toBe(false)
    expect(POSTHOG_OPTIONS.disable_external_dependency_loading).toBe(true)
    expect(POSTHOG_OPTIONS.api_host).toBe('/ingest')
  })
})

// `captureEvent` is called from click handlers on the marketing site, outside
// the provider that gates <ConsentedTrackers />, so it re-reads the consent
// cookie itself. These cases are what keeps a pricing click from loading the
// SDK for a visitor who refused analytics.
describe('captureEvent() consent gate', () => {
  function setConsentCookie(value: string | null): void {
    // biome-ignore lint/suspicious/noDocumentCookie: the banner writes this cookie the same way (provider.tsx), and jsdom has no Cookie Store API.
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
    // biome-ignore lint/suspicious/noDocumentCookie: same reason.
    if (value) document.cookie = `${COOKIE_NAME}=${value}; path=/`
  }

  beforeEach(() => {
    setConsentCookie(null)
  })

  it('never loads the SDK with no decision on record', async () => {
    env.key = 'phc_test'
    captureEvent('pricing_plan_click', { plan: 'PRO' })
    await settle()
    expect(sdk.imports).toBe(0)
    expect(sdk.capture).not.toHaveBeenCalled()
  })

  it('never loads the SDK when the visitor refused analytics cookies', async () => {
    env.key = 'phc_test'
    setConsentCookie('rejected')
    captureEvent('pricing_plan_click', { plan: 'PRO' })
    await settle()
    expect(sdk.imports).toBe(0)
    expect(sdk.capture).not.toHaveBeenCalled()
  })

  it('sends nothing when the deployment has no key, consent or not', async () => {
    setConsentCookie('accepted')
    captureEvent('pricing_plan_click', { plan: 'PRO' })
    await settle()
    expect(sdk.imports).toBe(0)
    expect(sdk.capture).not.toHaveBeenCalled()
  })

  it('sends the event with its properties once consent is accepted', async () => {
    env.key = 'phc_test'
    setConsentCookie('accepted')
    captureEvent('pricing_plan_click', { plan: 'PRO', billing: 'yearly' })
    await waitFor(() => expect(sdk.capture).toHaveBeenCalledTimes(1))
    expect(sdk.capture).toHaveBeenCalledWith('pricing_plan_click', {
      plan: 'PRO',
      billing: 'yearly',
    })
  })

  it('reads the cookie per call, so a fresh acceptance takes effect', async () => {
    env.key = 'phc_test'
    captureEvent('blog_post_read', { post_slug: 'a' })
    await settle()
    expect(sdk.capture).not.toHaveBeenCalled()

    setConsentCookie('accepted')
    captureEvent('blog_post_read', { post_slug: 'a' })
    await waitFor(() => expect(sdk.capture).toHaveBeenCalledTimes(1))
  })
})
