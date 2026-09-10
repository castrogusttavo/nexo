import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

// ---------------------------------------------------------------------------
// After Layer 1 (pagination), /issues got fast enough (10-16ms) for a VU
// with no think-time to blow through the apiLimiter (100 req/60s per user —
// src/lib/rate-limit.ts) in seconds — a real finding, not a bug (see Round 3,
// "Finding — rate limiter becomes the ceiling"). This script simulates real
// user cadence (think-time of 2-4s per iteration, same order of magnitude
// as the 09-vu-nao-e-usuario-real.png chart) to measure real server
// capacity, not how fast it hits its own rate limit.
//
//   BASE_URL=http://localhost:3000 k6 run k6/stress-issues-sustained.js
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const ORIGIN = __ENV.ORIGIN || BASE_URL
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
        { duration: '20s', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '20s', target: 500 },
        { duration: '30s', target: 500 },
        { duration: '20s', target: 1000 },
        { duration: '30s', target: 1000 },
        { duration: '20s', target: 2000 },
        { duration: '30s', target: 2000 },
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
    throw new Error(`Server did not respond at ${BASE_URL} (status ${res.status}).`)
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function uniqueIp() {
  const octet = () => Math.floor(Math.random() * 200) + 10
  return `${octet()}.${octet()}.${octet()}.${octet()}`
}

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

  // Think-time: 2-4s between iterations, to avoid blowing through the
  // 100 req/60s per-user rate limit and to measure real server capacity.
  sleep(2 + Math.random() * 2)
}
