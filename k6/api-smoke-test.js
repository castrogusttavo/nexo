import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Accept 2xx-4xx as expected — this test intentionally hits unauthenticated endpoints.
// Only 5xx and connection errors should count as failures.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export const options = {
  vus: 1,
  duration: '15s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // GET /api/auth/get-session — returns 200 with null session when unauthenticated
  const meRes = http.get(`${BASE_URL}/api/auth/get-session`);
  check(meRes, {
    'GET /api/auth/get-session returns 200': (r) => r.status === 200,
    'GET /api/auth/get-session responds under 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);

  // POST /api/auth/sign-in/email — expects 4xx with empty body
  const signInRes = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({ email: '', password: '' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(signInRes, {
    'POST /api/auth/sign-in/email returns 4xx': (r) => r.status >= 400 && r.status < 500,
    'POST /api/auth/sign-in/email responds under 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
