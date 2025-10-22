import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const scenarioCounts = new Counter('scenarios');

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
const PROJECT_SLUG = __ENV.PROJECT_SLUG || 'demo';

export default function () {
  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - Homepage visitors
    group('Homepage Flow', function () {
      scenarioCounts.add(1, { scenario: 'homepage' });

      const res = http.get(`${BASE_URL}/`);
      check(res, {
        'homepage status is 200': (r) => r.status === 200,
        'homepage loads in <2s': (r) => r.timings.duration < 2000,
        'homepage contains title': (r) => r.body.includes('SignalsLoop') || r.body.includes('title'),
      }) || errorRate.add(1);
    });
  } else if (scenario < 0.5) {
    // 20% - Public project board viewers
    group('Public Board Flow', function () {
      scenarioCounts.add(1, { scenario: 'public_board' });

      // Visit public board
      const boardRes = http.get(`${BASE_URL}/${PROJECT_SLUG}`);
      check(boardRes, {
        'board accessible': (r) => r.status === 200 || r.status === 404,
        'board loads in <2s': (r) => r.timings.duration < 2000,
      }) || errorRate.add(1);
    });
  } else if (scenario < 0.75) {
    // 25% - API consumers
    group('API Flow', function () {
      scenarioCounts.add(1, { scenario: 'api' });

      // Test posts endpoint
      const postsRes = http.get(`${BASE_URL}/api/v1/posts?project_slug=${PROJECT_SLUG}&limit=10`);
      check(postsRes, {
        'posts API status is 200': (r) => r.status === 200,
        'posts API returns JSON': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.hasOwnProperty('posts');
          } catch (e) {
            return false;
          }
        },
        'posts API loads in <1s': (r) => r.timings.duration < 1000,
      }) || errorRate.add(1);

      sleep(0.5);

      // Test different sorting
      const sortedRes = http.get(`${BASE_URL}/api/v1/posts?project_slug=${PROJECT_SLUG}&limit=5&sort=vote_count&order=desc`);
      check(sortedRes, {
        'sorted posts API works': (r) => r.status === 200,
      }) || errorRate.add(1);
    });
  } else if (scenario < 0.85) {
    // 10% - Auth flow attempts
    group('Auth Flow', function () {
      scenarioCounts.add(1, { scenario: 'auth' });

      // Visit login page
      const loginPageRes = http.get(`${BASE_URL}/auth/login`);
      check(loginPageRes, {
        'login page accessible': (r) => r.status === 200 || r.status === 404,
      }) || errorRate.add(1);

      sleep(1);

      // Visit signup page
      const signupPageRes = http.get(`${BASE_URL}/auth/signup`);
      check(signupPageRes, {
        'signup page accessible': (r) => r.status === 200 || r.status === 404,
      }) || errorRate.add(1);
    });
  } else if (scenario < 0.95) {
    // 10% - Dashboard access attempts
    group('Dashboard Flow', function () {
      scenarioCounts.add(1, { scenario: 'dashboard' });

      const dashRes = http.get(`${BASE_URL}/app`);
      check(dashRes, {
        'dashboard accessible': (r) => r.status === 200 || r.status === 302 || r.status === 401,
      }) || errorRate.add(1);
    });
  } else {
    // 5% - Other public pages
    group('Other Pages', function () {
      scenarioCounts.add(1, { scenario: 'other' });

      const pages = ['/privacy', '/terms'];
      const page = pages[Math.floor(Math.random() * pages.length)];

      const res = http.get(`${BASE_URL}${page}`);
      check(res, {
        'page accessible': (r) => r.status === 200 || r.status === 404,
      }) || errorRate.add(1);
    });
  }

  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}
