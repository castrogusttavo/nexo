import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Real stress test: ramps well past what the CI-shared runner (k6-local)
// can meaningfully measure, since there the load generator and the app
// under test fight over the same 2 vCPUs. This is meant to run only
// against a real target (production today, staging if one ever exists),
// alongside k6-production-smoke.
//
// abortOnFail on http_req_failed stops the run early once the error rate
// spikes instead of continuing to hammer a target that's already
// degrading — delayAbortEval gives it a grace window so one bad request
// doesn't abort the whole run.
export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: [
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' },
    ],
  },
};

// Read-only public pages only. A stress test must never hit endpoints
// that create records or send email (talk-to-sales, careers apply,
// sign-up) — many concurrent VUs would spam real inboxes/DB rows in
// production.
const pages = ['/', '/sign-in', '/sign-up', '/pricing', '/status', '/careers', '/contact'];

export default function () {
  const page = pages[Math.floor(Math.random() * pages.length)];
  const res = http.get(`${BASE_URL}${page}`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1500ms': (r) => r.timings.duration < 1500,
  });
  sleep(Math.random() * 2 + 0.5);
}
