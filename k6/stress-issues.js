import http from 'k6/http'
import { check } from 'k6'
import { SharedArray } from 'k6/data'

// ---------------------------------------------------------------------------
// Stress test focado só em GET /issues (a rota real que o TanStack Query
// chama — ver k6/flows.js). Sobe VUs em degraus até achar o ponto de
// ruptura real (erro, não só lentidão). Aborta cedo se a taxa de falha
// passar de 50%, pra não gastar tempo depois de já ter achado o limite.
//
//   BASE_URL=http://localhost:3000 k6 run k6/stress-issues.js
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
// better-auth valida Origin contra trustedOrigins (src/lib/auth.ts:44,
// travado em BETTER_AUTH_URL). Em produção isso é o domínio real, não o
// host que a gente efetivamente conecta (localhost:3000 pra bypassar
// nginx) — sem isso o login cai com 403 antes de qualquer rate limit.
const ORIGIN = __ENV.ORIGIN || BASE_URL
// LIMIT= (vazio) reproduz o Experimento 1 sem paginação; LIMIT=1000 (padrão)
// testa a Camada 1 — comparação lado a lado no mesmo script.
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

// Mesma técnica do e2e helper (src/__tests__/helpers/e2e.ts): IP diferente
// por tentativa pra não esbarrar no rate limit de login do better-auth
// (10 tentativas/IP/15min — src/lib/auth.ts:37), que não existiria com
// tráfego real distribuído em milhões de IPs.
function uniqueIp() {
  const octet = () => Math.floor(Math.random() * 200) + 10
  return `${octet()}.${octet()}.${octet()}.${octet()}`
}

// k6 roda cada VU em sua própria instância JS, então essa variável de
// módulo funciona como estado por-VU: cada VU loga só na primeira
// iteração e reaproveita a sessão depois — isolando a medição do custo
// de /issues do custo de login (argon2) repetido.
//
// O cookie jar automático do k6 NÃO sobrevive entre iterações aqui
// (testado e confirmado — zera a cada nova iteração, mesmo dentro do
// mesmo VU). Por isso o cookie é extraído manualmente do Set-Cookie do
// login e reenviado explícito no header em cada request.
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
