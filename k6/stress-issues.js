import http from 'k6/http'
import { check } from 'k6'
import { SharedArray } from 'k6/data'

// ---------------------------------------------------------------------------
// Stress test focused only on GET /issues (the real route TanStack Query
// calls — see k6/flows.js). Ramps VUs in steps until it finds the real
// breaking point (error, not just slowness). Aborts early if the failure
// rate passes 50%, to avoid wasting time after the limit is already found.
//
//   BASE_URL=http://localhost:3000 k6 run k6/stress-issues.js
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
// better-auth validates Origin against trustedOrigins (src/lib/auth.ts:44,
// pinned to BETTER_AUTH_URL). In production this is the real domain, not
// the host we actually connect to (localhost:3000 to bypass nginx) —
// without this, login fails with 403 before any rate limit kicks in.
const ORIGIN = __ENV.ORIGIN || BASE_URL
// LIMIT= (empty) reproduces Experiment 1 without pagination; LIMIT=1000
// (default) tests Layer 1 — side-by-side comparison in the same script.
const LIMIT = __ENV.LIMIT ?? '1000'
const PASSWORD = 'LoadTest@12345678'

const manifest = JSON.parse(open('../scripts/.load-test-manifest.json'))

const onboardedUsers = new SharedArray('onboarded', () =>
  Array.from(
    { length: manifest.onboardedUserCount },
    (_, i) => manifest.onboardedUserEmailPattern.replace('{i}', i),
  ),
)

export const options = {
  scenarios: {
    stress_issues: {
      executor: 'ramping-vus',
      exec: 'issuesFlow',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 10 },
        { duration: '20s', target: 25 },
        { duration: '20s', target: 50 },
        { duration: '20s', target: 100 },
        { duration: '20s', target: 150 },
        { duration: '20s', target: 200 },
        { duration: '30s', target: 200 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.5', abortOnFail: true, delayAbortEval: '5s' }],
  },
}

export function setup() {
  const res = http.get(BASE_URL, { tags: { name: 'setup_check' } })
  if (res.status !== 200) {
    throw new Error(`Servidor não respondeu em ${BASE_URL} (status ${res.status}).`)
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Same technique as the e2e helper (src/__tests__/helpers/e2e.ts): a
// different IP per attempt to avoid hitting better-auth's login rate limit
// (10 attempts/IP/15min — src/lib/auth.ts:37), which wouldn't exist with
// real traffic distributed across millions of IPs.
function uniqueIp() {
  const octet = () => Math.floor(Math.random() * 200) + 10
  return `${octet()}.${octet()}.${octet()}.${octet()}`
}

// k6 runs each VU in its own JS instance, so this module-level variable
// works as per-VU state: each VU logs in only on the first iteration
// and reuses the session afterward — isolating the /issues cost
// measurement from the repeated login (argon2) cost.
//
// k6's automatic cookie jar does NOT survive across iterations here
// (tested and confirmed — it resets on every new iteration, even within
// the same VU). That's why the cookie is manually extracted from the
// login's Set-Cookie and explicitly resent in the header on each request.
let cookieHeader = null

function authenticate(email) {
  const res = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({ email, password: PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
        'X-Forwarded-For': uniqueIp(),
      },
      tags: { name: 'auth_setup' },
    },
  )
  check(res, { 'auth_setup: 200': (r) => r.status === 200 })
  if (res.status === 200) {
    const raw = res.headers['Set-Cookie']
    const parts = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map((c) => c.split(';')[0])
    cookieHeader = parts.join('; ')
  }
}

export function issuesFlow() {
  if (!cookieHeader) authenticate(pick(onboardedUsers))

  const query = LIMIT ? `?limit=${LIMIT}` : ''
  const res = http.get(
    `${BASE_URL}/api/workspaces/${manifest.workspaceId}/projects/${manifest.mainProjectSlug}/issues${query}`,
    { headers: { Cookie: cookieHeader }, tags: { name: 'issues' }, timeout: '30s' },
  )
  check(res, { 'issues: 200': (r) => r.status === 200 })
}
