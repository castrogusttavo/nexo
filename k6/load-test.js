import http from 'k6/http';
import { check, sleep } from 'k6';
import { requestCeilingMs, thresholds } from './profiles.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CEILING_MS = requestCeilingMs(BASE_URL);

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: thresholds('load', BASE_URL),
};

const pages = ['/', '/sign-in', '/sign-up', '/contact'];

export default function () {
  const page = pages[Math.floor(Math.random() * pages.length)];
  const res = http.get(`${BASE_URL}${page}`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    [`response time < ${CEILING_MS}ms`]: (r) => r.timings.duration < CEILING_MS,
  });
  sleep(Math.random() * 3 + 1);
}
