// Latency budgets, per environment.
//
// The same script gets pointed at two very different things: a dev server on
// loopback, and production over the public internet with TLS, nginx and a
// round trip to São Paulo. A single set of numbers cannot describe both — the
// localhost budgets (p95 under 500ms) fail against production for reasons that
// have nothing to do with the server, and the production budgets would hide a
// real regression locally.
//
// The profile is inferred from BASE_URL, so nobody has to remember a flag.
// K6_PROFILE overrides it when the inference is wrong (a tunnel, a staging box
// on a private address).
//
// The remote numbers come from measurement, not taste: single-client samples of
// /, /sign-in, /pricing and /careers on nexopm.com sit between 110ms and 360ms
// warm, with first-hit outliers at 0.8s and 1.5s. p95 at 1.5s leaves room for
// the cold hit; anything slower than that is worth looking at.

const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal|nginx|nextjs-app)([:/]|$)/

export function profileFor(baseUrl) {
  if (__ENV.K6_PROFILE) return __ENV.K6_PROFILE
  return LOOPBACK.test(baseUrl) ? 'local' : 'remote'
}

const BUDGETS = {
  smoke: {
    local: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.01'],
    },
    remote: {
      http_req_duration: ['p(95)<1500', 'p(99)<3000'],
      http_req_failed: ['rate<0.01'],
    },
  },
  load: {
    local: {
      http_req_duration: ['p(95)<800', 'p(99)<1500'],
      http_req_failed: ['rate<0.01'],
    },
    remote: {
      http_req_duration: ['p(95)<2500', 'p(99)<5000'],
      http_req_failed: ['rate<0.01'],
    },
  },
  api: {
    local: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.05'],
    },
    remote: {
      http_req_duration: ['p(95)<1500'],
      http_req_failed: ['rate<0.05'],
    },
  },
}

/** Per-request ceiling for the inline `check()`s, in milliseconds. */
const SINGLE_REQUEST_MS = { local: 500, remote: 1500 }

export function thresholds(kind, baseUrl) {
  const profile = profileFor(baseUrl)
  const budget = BUDGETS[kind]
  if (!budget) throw new Error(`unknown budget "${kind}"`)
  return budget[profile] ?? budget.local
}

export function requestCeilingMs(baseUrl) {
  return SINGLE_REQUEST_MS[profileFor(baseUrl)] ?? SINGLE_REQUEST_MS.local
}
