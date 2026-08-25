import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

// ---------------------------------------------------------------------------
// Isola só o login (POST /api/auth/sign-in/email) — sem /issues junto —
// pra separar "argon2 é caro" de "o gargalo composto de login+/issues juntos
// é outra coisa". Cada VU faz login repetidamente (não uma vez só), pra
// achar o teto de verificações argon2 concorrentes que o processo aguenta.
//
// Rodada 6: com o gate de concorrência (src/lib/auth-concurrency-gate.ts),
// um login além da capacidade recebe 429+Retry-After rápido em vez de
// ficar pendurado 10-25s — igual o client real (sign-in-form.tsx) faz,
// este script replica a mesma lógica de retry (até 2 tentativas, backoff
// pelo Retry-After + jitter) pra medir a experiência real do usuário, não
// só a taxa de sucesso na primeira tentativa.
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

  // Cadência real de login (não fica logando em loop apertado) — ainda
  // assim gera pressão real de argon2 concorrente com muitas VUs.
  sleep(1 + Math.random())
}
