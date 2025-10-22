import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Load test configuration for production
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 25 },    // Ramp up to 25 users
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '1m', target: 25 },    // Ramp down to 25 users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],    // Error rate should be below 5%
    errors: ['rate<0.05'],             // Custom error rate should be below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://signalsloop.com';

export default function () {
  const scenario = Math.random();

  if (scenario < 0.6) {
    // 60% - Homepage visitors
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'homepage status is 200': (r) => r.status === 200,
      'homepage loads in <2s': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1);
  } else if (scenario < 0.9) {
    // 30% - Public API consumers (posts endpoint)
    const res = http.get(`${BASE_URL}/api/v1/posts?project_slug=demo&limit=10`);
    check(res, {
      'posts API status is 200': (r) => r.status === 200,
      'posts API returns valid JSON': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('posts');
        } catch (e) {
          return false;
        }
      },
      'posts API loads in <1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
  } else {
    // 10% - Authenticated dashboard access
    const res = http.get(`${BASE_URL}/app`);
    check(res, {
      'dashboard accessible': (r) => r.status === 200 || r.status === 302,
    }) || errorRate.add(1);
  }

  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}
