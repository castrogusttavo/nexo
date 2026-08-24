import http from 'k6/http'
import { check } from 'k6'
import { SharedArray } from 'k6/data'

// Mesma coisa que stress-issues.js, mas distribui os VUs entre N
// instâncias do servidor (uma por porta) — simula ter um load balancer
// na frente de várias réplicas. Ports vêm de PORTS (csv), default 4
// instâncias locais (uma por core).
const HOST = __ENV.HOST || 'http://localhost'
const PORTS = (__ENV.PORTS || '3000,3001,3002,3003').split(',').map((p) => p.trim())
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
  for (const port of PORTS) {
    const res = http.get(`${HOST}:${port}`, { tags: { name: 'setup_check' } })
    if (res.status !== 200) {
      throw new Error(`Instância em ${HOST}:${port} não respondeu (status ${res.status}).`)
    }
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function uniqueIp() {
  const octet = () => Math.floor(Math.random() * 200) + 10
  return `${octet()}.${octet()}.${octet()}.${octet()}`
}

// Cada VU fica preso numa instância (round-robin por __VU), como um load
// balancer com sticky session faria — evita reautenticar em cada request
// e mede o efeito real de distribuir carga entre processos.
const baseUrl = `${HOST}:${PORTS[(__VU - 1) % PORTS.length]}`

let cookieHeader = null

function authenticate(email) {
  const res = http.post(
    `${baseUrl}/api/auth/sign-in/email`,
    JSON.stringify({ email, password: PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
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

  const res = http.get(
    `${baseUrl}/api/workspaces/${manifest.workspaceId}/projects/${manifest.mainProjectSlug}/issues`,
    { headers: { Cookie: cookieHeader }, tags: { name: 'issues' }, timeout: '30s' },
  )
  check(res, { 'issues: 200': (r) => r.status === 200 })
}
