// k6/load.js
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'
import exec from 'k6/execution'
import http from 'k6/http'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js'

// Runs against https://nexopm.com from the `Load Test (Production)` workflow
// with LOAD_TEST_TOKEN so nginx exempts it from limit_req and forwards the
// spoofed per-VU X-Forwarded-For untouched (one auth bucket per VU, as with
// real users). Without the token, run it on the production host against
// localhost:3000 instead (EXPERIMENT-LOG, Round 2). ORIGIN must match
// BETTER_AUTH_URL or sign-in answers 403.
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const ORIGIN = __ENV.ORIGIN || BASE_URL
const PROFILE = __ENV.PROFILE || 'breakpoint' // breakpoint | hold
const VUS = Number(__ENV.VUS || 2500) // hold: users kept at the plateau
const RAMP = __ENV.RAMP || '4m' // hold: ramp-up (logins are ~20/s max)
const HOLD = __ENV.HOLD || '5m' // hold: 2m or 5m
const STEP = Number(__ENV.STEP || 500) // breakpoint: size of each step
const MAX = Number(__ENV.MAX || 2000) // breakpoint: ceiling
const P95_MS = Number(__ENV.P95_MS || 1500) // what counts as "holding up"
const ISSUES_LIMIT = __ENV.ISSUES_LIMIT || '50'
const THINK_MIN = Number(__ENV.THINK_MIN || 3) // seconds between requests
const THINK_MAX = Number(__ENV.THINK_MAX || 15)

// Every request asks for compression like a browser does: uncompressed, the
// marketing pages average ~470 KB (/pricing is 1MB) agains ~42 KB gzipped,
// which saturates the generator's uplink before it saturates the server.
// LOAD_TEST_TOKEN lets nginx skip limit_req for this run (see the
// $http_x_load_test map in the production nginx config); without it, a single
// generator IP is throttled within seconds.
const COMMON_HEADERS = {
  'Accept-Enconding': 'gzip, br',
  ...(__ENV.LOAD_TEST_TOKEN ? { 'X-Load-Test': __ENV.LOAD_TEST_TOKEN } : {})
}

// open() resolves relative to this file, not to the working directory
const manifest = JSON.parse(open('../scripts/.load-test-manifest.json'))

const users = new SharedArray('onboarded', () =>
  Array.from({ length: manifest.onboardedUserCount }, (_, i) =>
    manifest.onboardedUserEmailPattern.replace('{i}', i),
  ),
)

function breakpointStages() {
  const stages = []
  for (let t = STEP; t <= MAX; t += STEP) {
    stages.push({ duration: '1m', target: t }) // climb
    stages.push({ duration: '2m', target: t }) // hold the step
  }
  return stages
}

const scenarios = {
  breakpoint: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: breakpointStages(),
    gracefulRampDown: '30s',
  },
  hold: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: RAMP, target: VUS },
      { duration: HOLD, target: VUS },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
}

// In breakpoint, stop as soon as the SLO breaks: the VU count at that moment
// is the answer. In hold, run to the end to get the full distribution.
// Sign-in (kind:auth) is measured but kept out of the SLO on purpose.
const abort = PROFILE === 'breakpoint'
const slo = (threshold) => [{ threshold, abortOnFail: abort, delayAbortEval: '1m' }]

export const options = {
  scenarios: { [PROFILE]: scenarios[PROFILE] },
  // Bodies are never read (checks look at status only); keeping them costs
  // memory per VU, which is what limits a 2-vCPU runner.
  discardResponseBodies: true,
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    'http_req_failed{kind:api}': slo('rate<0.01'),
    'http_req_failed{kind:page}': slo('rate<0.01'),
    'http_req_duration{kind:api}': slo(`p(95)<${P95_MS}`),
    'http_req_duration{kind:page}': slo(`p(95)<${P95_MS}`),
    'http_req_duration{kind:auth}': ['p(95)<5000'],
    'http_reqs{status:429}': ['count<1'], // any 429 = test is invalid, not slowness
  },
}

export function setup() {
  const peak = PROFILE === 'hold' ? VUS : MAX
  if (users.length < peak) {
    console.warn(
      `${users.length} seeded users for up to ${peak} VUs: users will be shared and may hit the 100 req/min apiLimiter`,
    )
  }
  const res = http.get(`${BASE_URL}/api/health`, { headers: COMMON_HEADERS })
  if (res.status !== 200) throw new Error(`${BASE_URL} answered ${res.status}`)
}

const PAGES = ['/', '/pricing', '/status', '/about']
let cookieHeader = null

function randomIp() {
  const octet = () => Math.floor(Math.random() * 200) + 10
  return `${octet()}.${octet()}.${octet()}.${octet()}`
}

function signIn() {
  const email = users[(exec.vu.idInTest - 1) % users.length]
  const res = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({ email, password: manifest.password }),
    {
      headers: {
        ...COMMON_HEADERS,
        'Content-Type': 'application/json',
        Origin: ORIGIN,
        'X-Forwarded-For': randomIp(),
      },
      tags: { kind: 'auth', name: 'POST /api/auth/sign-in/email' },
      timeout: '30s',
    },
  )
  check(res, { 'sign-in 200': (r) => r.status === 200 })
  if (res.status !== 200) return
  const raw = res.headers['Set-Cookie']
  cookieHeader = (Array.isArray(raw) ? raw : [raw])
    .filter(Boolean)
    .map((c) => c.split(';')[0])
    .join('; ')
}

function api(path, name) {
  const res = http.get(`${BASE_URL}${path}`, {
    headers: { ...COMMON_HEADERS, Cookie: cookieHeader },
    tags: { kind: 'api', name },
  })
  if (res.status === 401) cookieHeader = null // re-login next iteration
  check(res, { [`${name} 200`]: (r) => r.status === 200 })
}

function hitPage() {
  const path = PAGES[Math.floor(Math.random() * PAGES.length)]
  const res = http.get(`${BASE_URL}${path}`, {
    headers: COMMON_HEADERS,
    tags: { kind: 'page', name: `GET ${path}` },
  })
  check(res, { 'page 200': (r) => r.status === 200 })
}

function hitApi() {
  const roll = Math.random()
  const workspace = `/api/workspaces/${manifest.workspaceId}`
  if (roll < 0.5) {
    api(`${workspace}/projects/${manifest.mainProjectSlug}/issues?limit=${ISSUES_LIMIT}`, 'GET issues')
  } else if (roll < 0.75) {
    api(`${workspace}/projects`, 'GET projects')
  } else {
    api('/api/users/me', 'GET /api/users/me')
  }
}

export default function () {
  if (!cookieHeader) {
    signIn()
  } else if (Math.random() < 0.4) {
    hitPage()
  } else {
    hitApi()
  }

  sleep(THINK_MIN + Math.random() * (THINK_MAX - THINK_MIN))
}

// handleSummary paths resolve against the working directory: run from the repo root
export function handleSummary(data) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [`k6/results/${PROFILE}-${stamp}.json`]: JSON.stringify(data, null, 2),
  }
}
