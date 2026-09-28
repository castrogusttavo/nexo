import http from 'k6/http';
import { check, sleep } from 'k6';
import { requestCeilingMs, thresholds } from './profiles.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CEILING_MS = requestCeilingMs(BASE_URL);

export const options = {
  vus: 1,
  duration: '30s',
  // Budget by environment: the localhost numbers fail against production over
  // TLS and a real network, for reasons that are not the server's fault.
  thresholds: thresholds('smoke', BASE_URL),
};

const pages = ['/', '/sign-in', '/sign-up', '/contact'];

export default function () {
  for (const page of pages) {
    const res = http.get(`${BASE_URL}${page}`);
    check(res, {
      [`${page} returns 200`]: (r) => r.status === 200,
      [`${page} responds under ${CEILING_MS}ms`]: (r) =>
        r.timings.duration < CEILING_MS,
    });
    sleep(1);
  }
}
