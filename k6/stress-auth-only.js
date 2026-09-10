import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

// ---------------------------------------------------------------------------
// Isolates just the login (POST /api/auth/sign-in/email) — without /issues
// alongside — to separate "argon2 is expensive" from "the compound login+
// /issues bottleneck is something else". Each VU logs in repeatedly (not
// just once), to find the ceiling of concurrent argon2 verifications the
// process can handle.
//
// Round 6: with the concurrency gate (src/lib/auth-concurrency-gate.ts),
// a login beyond capacity gets a fast 429+Retry-After instead of hanging
// for 10-25s — just like the real client (sign-in-form.tsx) does, this
// script replicates the same retry logic (up to 2 attempts, backoff from
// Retry-After + jitter) to measure the real user experience, not just
// the first-attempt success rate.
//
//   BASE_URL=http://localhost:3000 k6 run k6/stress-auth-only.js
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const ORIGIN = __ENV.ORIGIN || BASE_URL
const PASSWORD = 'LoadTest@12345678'
const MAX_RETRIES = 2

const manifest = JSON.parse(open('../scripts/.load-test-manifest.json'))

const onboardedUsers = new SharedArray('onboarded', () =>
  Array.from(
    { length: manifest.onboardedUserCount },
    (_, i) => manifest.onboardedUserEmailPattern.replace('{i}', i),
  ),
)

export const options = {
  scenarios: {
    stress_auth: {
      executor: 'ramping-vus',
      exec: 'authFlow',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 20 },
        { duration: '25s', target: 20 },
        { duration: '15s', target: 50 },
        { duration: '25s', target: 50 },
        { duration: '15s', target: 100 },
        { duration: '25s', target: 100 },
        { duration: '15s', target: 200 },
        { duration: '25s', target: 200 },
        { duration: '15s', target: 400 },
        { duration: '25s', target: 400 },
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

function uniqueIp() {
  const octet = () => Math.floor(Math.random() * 200) + 10
  return `${octet()}.${octet()}.${octet()}.${octet()}`
}

function attemptLogin(email) {
  return http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({ email, password: PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
        'X-Forwarded-For': uniqueIp(),
      },
      tags: { name: 'auth_only' },
      timeout: '30s',
    },
  )
}

export function authFlow() {
  const email = pick(onboardedUsers)
  let res = attemptLogin(email)
  check(res, { 'auth_only (1a tentativa): 200': (r) => r.status === 200 })

  let attempt = 0
  while (res.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = Number(res.headers['Retry-After'] || 3)
    sleep(retryAfter + Math.random() * 0.5)
    res = attemptLogin(email)
    attempt++
  }
  check(res, { 'auth_only (final, com retry): 200': (r) => r.status === 200 })

  // Real login cadence (not hammering in a tight loop) — still generates
  // real concurrent argon2 pressure with many VUs.
  sleep(1 + Math.random())
}
