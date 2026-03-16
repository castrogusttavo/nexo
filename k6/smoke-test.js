import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const pages = ['/', '/sign-in', '/sign-up', '/contact'];

export default function () {
  for (const page of pages) {
    const res = http.get(`${BASE_URL}${page}`);
    check(res, {
      [`${page} returns 200`]: (r) => r.status === 200,
      [`${page} responds under 500ms`]: (r) => r.timings.duration < 500,
    });
    sleep(1);
  }
}
