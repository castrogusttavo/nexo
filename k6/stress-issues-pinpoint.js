import http from 'k6/http'
import { check } from 'k6'
import { SharedArray } from 'k6/data'

// Teste focado só na faixa 200-500 VUs (onde o teto apareceu no
// stress-issues-ceiling.js), com degraus mais longos, pra separar
// "satura recurso de verdade" de "artefato de rodar o k6 na mesma
// máquina que a pilha inteira".
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080'
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
        { duration: '15s', target: 250 },
        { duration: '40s', target: 250 },
        { duration: '15s', target: 350 },
        { duration: '40s', target: 350 },
        { duration: '15s', target: 450 },
        { duration: '40s', target: 450 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.6', abortOnFail: true, delayAbortEval: '5s' }],
  },
}

export function setup() {
  const res = http.get(BASE_URL, { tags: { name: 'setup_check' } })
  if (res.status !== 200) throw new Error(`Servidor não respondeu (status ${res.status}).`)
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
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'X-Forwarded-For': uniqueIp() },
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
