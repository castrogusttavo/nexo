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

// Cada fase (rampa + sustentação + rampa) roda em sequência, não em paralelo —
// assim cada fluxo tem seu bloco isolado de métricas, sem se misturar no
// resultado. Pra simular tráfego misto de verdade, tire os `startTime` e deixe
// tudo com `startTime: '0s'`.
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

// O better-auth tem rate limit de login embutido (10 tentativas/IP/15min,
// ativo em produção — src/lib/auth.ts:37). Em tráfego real de 1M usuários
// isso nunca esbarraria num único IP; aqui, rodando tudo de uma máquina só,
// esbarraria em segundos e mediria o rate limiter, não a aplicação. Mesma
// técnica que o helper de e2e já usa (src/__tests__/helpers/e2e.ts): manda
// um X-Forwarded-For diferente por tentativa pra simular IPs distintos.
function uniqueIp() {
  const octet = () => Math.floor(Math.random() * 200) + 10
  return `${octet()}.${octet()}.${octet()}.${octet()}`
}

// k6 mantém um cookie jar por VU: o Set-Cookie da resposta de login é
// automaticamente reenviado nas próximas requisições da mesma iteração/VU.
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

// O endpoint que sustenta a tela de issues não é a página SSR — é a API que o
// TanStack Query chama no client (`useIssues`). A página em si devolve só o
// shell; os dados (sem paginação) vêm daqui. Ver ARTICLE.md / achado do dia
// 22/08: 15k issues = ~8,6MB de JSON numa resposta só.
export function issuesFlow() {
  authenticate(pick(onboardedUsers))
  const res = http.get(
    `${BASE_URL}/api/workspaces/${manifest.workspaceId}/projects/${manifest.mainProjectSlug}/issues`,
    { tags: { name: 'issues' } },
  )
  check(res, { 'issues: 200': (r) => r.status === 200 })
}

// Só mede o carregamento do wizard (GET, segue os redirects até o primeiro
// passo). Não submete os server actions que avançam o step — o protocolo de
// Server Actions do Next exige um action id extraído do build, frágil de
// reproduzir aqui. Cobre o custo de auth-guard + leitura de perfil, que é a
// maior parte do custo por request de qualquer forma.
export function onboardingFlow() {
  const idx = (__VU - 1) % freshUsers.length
  authenticate(freshUsers[idx])
  const res = http.get(`${BASE_URL}/onboarding`, { tags: { name: 'onboarding' } })
  check(res, { 'onboarding: 200': (r) => r.status === 200 })
}
