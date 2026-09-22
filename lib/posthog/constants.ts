/**
 * Values shared by the browser client (lib/posthog/client.ts) and the build
 * (next.config.ts). Kept free of `zod` and of `@/lib/env/*` on purpose:
 * next.config.ts is evaluated before the app's env module is safe to import.
 */

/**
 * The project's ingestion host. A PostHog project belongs to one region and
 * its key only works there -- this project lives in the US cloud (verified
 * against /array/<key>/config: 200 on us, 404 on eu), so the default matches
 * it. Moving regions means a new project and a new key; events do not
 * migrate.
 */
export const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com'

/**
 * Same-origin path the browser talks to. Every PostHog request is rewritten
 * from here by next.config.ts, which keeps `connect-src` at `'self'` (no new
 * CSP host) and keeps the requests out of the blocklists that recognise
 * `*.i.posthog.com`.
 */
export const POSTHOG_PROXY_PATH = '/ingest'

/**
 * PostHog serves its static assets (remote config, the toolbar) from a sibling
 * of the ingestion host: `eu.i.posthog.com` -> `eu-assets.i.posthog.com`. A
 * self-hosted PostHog serves both from the same origin, so anything that is
 * not `<region>.i.posthog.com` is returned unchanged.
 */
export function posthogAssetHost(host: string): string {
  return host.replace(
    /^(https:\/\/[a-z0-9-]+)(\.i\.posthog\.com)$/,
    '$1-assets$2',
  )
}
