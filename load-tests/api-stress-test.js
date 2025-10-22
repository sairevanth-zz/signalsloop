import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

// Stress test configuration - pushes limits
export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 150 },   // Push to 150 users
    { duration: '2m', target: 150 },   // Hold at 150 users
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% under 3s
    http_req_failed: ['rate<0.1'],     // Allow up to 10% errors at peak
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://signalsloop.com';
const PROJECT_SLUG = __ENV.PROJECT_SLUG || 'demo';

export default function () {
  const endpoints = [
    `/api/v1/posts?project_slug=${PROJECT_SLUG}&limit=10`,
    `/api/v1/posts?project_slug=${PROJECT_SLUG}&limit=20&sort=vote_count&order=desc`,
    `/api/v1/posts?project_slug=${PROJECT_SLUG}&limit=5&category=feature`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response is valid JSON': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('posts') || body.hasOwnProperty('data');
      } catch (e) {
        return false;
      }
    },
    'response time OK': (r) => r.timings.duration < 3000,
  });

  if (!success) {
    errorRate.add(1);
  }

  apiDuration.add(res.timings.duration);

  sleep(0.5); // Shorter sleep for stress testing
}
