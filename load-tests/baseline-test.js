import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Baseline test - verify basic functionality under light load
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up to 5 users
    { duration: '1m', target: 10 },    // Increase to 10 users
    { duration: '1m', target: 10 },    // Maintain 10 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% errors
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://signalsloop.com';
const PROJECT_SLUG = __ENV.PROJECT_SLUG || 'demo';

export default function () {
  // Simple API test
  const res = http.get(`${BASE_URL}/api/v1/posts?project_slug=${PROJECT_SLUG}&limit=10`);

  const success = check(res, {
    'API status is 200': (r) => r.status === 200,
    'API returns JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    'API response time < 500ms': (r) => r.timings.duration < 500,
    'API returns posts': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.posts !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  sleep(1); // 1 second between requests
}
