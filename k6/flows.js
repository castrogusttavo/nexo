import http from 'k6/http'
import { check } from 'k6'
import { SharedArray } from 'k6/data'

// ---------------------------------------------------------------------------
// Config — sobrescreva via env, ex.:
//   VUS=100 ISSUES_VUS=40 HOLD_S=60 k6 run k6/flows.js
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const PASSWORD = 'LoadTest@12345678'

const VUS = Number(__ENV.VUS || 30)
const ISSUES_VUS = Number(__ENV.ISSUES_VUS || 15)
const RAMP_S = Number(__ENV.RAMP_S || 15)
const HOLD_S = Number(__ENV.HOLD_S || 30)
const ONBOARDING_VUS = Number(__ENV.ONBOARDING_VUS || 50)

const manifest = JSON.parse(open('../scripts/.load-test-manifest.json'))

const onboardedUsers = new SharedArray('onboarded', () =>
  Array.from(
    { length: manifest.onboardedUserCount },
    (_, i) => manifest.onboardedUserEmailPattern.replace('{i}', i),
  ),
)
const freshUsers = new SharedArray('fresh', () =>
  Array.from(
    { length: manifest.freshUserCount },
    (_, i) => manifest.freshUserEmailPattern.replace('{i}', i),
  ),
)

// Each phase (ramp + hold + ramp) runs sequentially, not in parallel —
// so each flow has its own isolated block of metrics, without mixing in the
// result. To simulate real mixed traffic, remove the `startTime`s and set
// everything to `startTime: '0s'`.
const PHASE_S = RAMP_S * 2 + HOLD_S
const stages = (target) => [
  { duration: `${RAMP_S}s`, target },
  { duration: `${HOLD_S}s`, target },
  { duration: `${RAMP_S}s`, target: 0 },
]

export const options = {
  scenarios: {
    login: {
      executor: 'ramping-vus',
      exec: 'loginFlow',
      startTime: '0s',
      startVUs: 0,
      stages: stages(VUS),
      gracefulRampDown: '5s',
    },
    home: {
      executor: 'ramping-vus',
      exec: 'homeFlow',
      startTime: `${PHASE_S}s`,
      startVUs: 0,
      stages: stages(VUS),
      gracefulRampDown: '5s',
    },
    issues: {
      executor: 'ramping-vus',
      exec: 'issuesFlow',
      startTime: `${PHASE_S * 2}s`,
      startVUs: 0,
      stages: stages(ISSUES_VUS),
      gracefulRampDown: '5s',
    },
    onboarding: {
      executor: 'per-vu-iterations',
      exec: 'onboardingFlow',
      startTime: `${PHASE_S * 3}s`,
      vus: Math.min(ONBOARDING_VUS, manifest.freshUserCount),
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    'http_req_failed{name:login}': ['rate<0.01'],
    'http_req_failed{name:home}': ['rate<0.01'],
    'http_req_failed{name:issues}': ['rate<0.01'],
    'http_req_failed{name:onboarding}': ['rate<0.01'],
  },
}

export function setup() {
  const res = http.get(BASE_URL, { tags: { name: 'setup_check' } })
  if (res.status !== 200) {
    throw new Error(`Servidor não respondeu em ${BASE_URL} (status ${res.status}). Confirme que o build de produção está de pé.`)
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// better-auth has a built-in login rate limit (10 attempts/IP/15min,
// active in production — src/lib/auth.ts:37). On real traffic from 1M
// users this would never hit a single IP; here, running everything from
// one machine, it would hit it in seconds and measure the rate limiter,
// not the app. Same technique the e2e helper already uses
// (src/__tests__/helpers/e2e.ts): send a different X-Forwarded-For per
// attempt to simulate distinct IPs.
function uniqueIp() {
  const octet = () => Math.floor(Math.random() * 200) + 10
  return `${octet()}.${octet()}.${octet()}.${octet()}`
}

// k6 keeps a cookie jar per VU: the Set-Cookie from the login response is
// automatically resent on subsequent requests in the same iteration/VU.
function authenticate(email) {
  const res = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({ email, password: PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        Origin: BASE_URL,
        'X-Forwarded-For': uniqueIp(),
      },
      tags: { name: 'auth_setup' },
    },
  )
  check(res, { 'auth_setup: 200': (r) => r.status === 200 })
  return res
}

export function loginFlow() {
  const email = pick(onboardedUsers)
  const res = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({ email, password: PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        Origin: BASE_URL,
        'X-Forwarded-For': uniqueIp(),
      },
      tags: { name: 'login' },
    },
  )
  check(res, { 'login: 200': (r) => r.status === 200 })
}

export function homeFlow() {
  authenticate(pick(onboardedUsers))
  const res = http.get(`${BASE_URL}/${manifest.workspaceSlug}`, {
    tags: { name: 'home' },
  })
  check(res, { 'home: 200': (r) => r.status === 200 })
}

// The endpoint that backs the issues screen isn't the SSR page — it's the API
// TanStack Query calls on the client (`useIssues`). The page itself only
// returns the shell; the data (unpaginated) comes from here. See ARTICLE.md /
// 08/22 finding: 15k issues = ~8.6MB of JSON in a single response.
export function issuesFlow() {
  authenticate(pick(onboardedUsers))
  const res = http.get(
    `${BASE_URL}/api/workspaces/${manifest.workspaceId}/projects/${manifest.mainProjectSlug}/issues`,
    { tags: { name: 'issues' } },
  )
  check(res, { 'issues: 200': (r) => r.status === 200 })
}

// Only measures loading the wizard (GET, follows redirects to the first
// step). Doesn't submit the server actions that advance the step — Next's
// Server Actions protocol requires an action id extracted from the build,
// fragile to reproduce here. Covers the auth-guard + profile-read cost,
// which is most of the per-request cost anyway.
export function onboardingFlow() {
  const idx = (__VU - 1) % freshUsers.length
  authenticate(freshUsers[idx])
  const res = http.get(`${BASE_URL}/onboarding`, { tags: { name: 'onboarding' } })
  check(res, { 'onboarding: 200': (r) => r.status === 200 })
}
