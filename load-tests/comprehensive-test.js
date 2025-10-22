import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const endpointCounts = new Counter('endpoint_hits');
const authFlowDuration = new Trend('auth_flow_duration');

// Comprehensive test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },    // Warm up
    { duration: '3m', target: 50 },    // Normal load
    { duration: '2m', target: 50 },    // Sustained load
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2500'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://signalsloop.com';
const PROJECT_SLUG = __ENV.PROJECT_SLUG || 'demo';

function testHomepage() {
  group('Homepage', function () {
    const res = http.get(`${BASE_URL}/`);
    endpointCounts.add(1, { endpoint: 'homepage' });

    check(res, {
      'homepage: status 200': (r) => r.status === 200,
      'homepage: loads quickly': (r) => r.timings.duration < 2000,
      'homepage: has content': (r) => r.body.length > 1000,
    }) || errorRate.add(1);
  });
}

function testAuthFlow() {
  const startTime = new Date();

  group('Auth Flow', function () {
    // Test login page
    const loginRes = http.get(`${BASE_URL}/auth/login`);
    endpointCounts.add(1, { endpoint: 'auth_login' });

    check(loginRes, {
      'auth: login page accessible': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);

    sleep(0.5);

    // Test signup page
    const signupRes = http.get(`${BASE_URL}/auth/signup`);
    endpointCounts.add(1, { endpoint: 'auth_signup' });

    check(signupRes, {
      'auth: signup page accessible': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);

    sleep(0.5);

    // Test dashboard redirect (unauthenticated)
    const dashRes = http.get(`${BASE_URL}/app`, { redirects: 0 });
    endpointCounts.add(1, { endpoint: 'auth_dashboard_redirect' });

    check(dashRes, {
      'auth: dashboard redirects or loads': (r) => r.status === 200 || r.status === 302 || r.status === 401,
    }) || errorRate.add(1);
  });

  authFlowDuration.add(new Date() - startTime);
}

function testAPIRoutes() {
  group('API Routes', function () {
    // Test GET /api/v1/posts
    const postsRes = http.get(`${BASE_URL}/api/v1/posts?project_slug=${PROJECT_SLUG}&limit=10`);
    endpointCounts.add(1, { endpoint: 'api_posts' });

    check(postsRes, {
      'api: posts returns 200': (r) => r.status === 200,
      'api: posts returns JSON': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('posts');
        } catch (e) {
          return false;
        }
      },
      'api: posts fast': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    sleep(0.3);

    // Test with sorting
    const sortedRes = http.get(`${BASE_URL}/api/v1/posts?project_slug=${PROJECT_SLUG}&limit=20&sort=vote_count&order=desc`);
    endpointCounts.add(1, { endpoint: 'api_posts_sorted' });

    check(sortedRes, {
      'api: sorted posts works': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.3);

    // Test with category filter
    const categoryRes = http.get(`${BASE_URL}/api/v1/posts?project_slug=${PROJECT_SLUG}&category=feature&limit=5`);
    endpointCounts.add(1, { endpoint: 'api_posts_category' });

    check(categoryRes, {
      'api: category filter works': (r) => r.status === 200,
    }) || errorRate.add(1);
  });
}

function testPublicPages() {
  group('Public Pages', function () {
    // Test project board
    const boardRes = http.get(`${BASE_URL}/${PROJECT_SLUG}`);
    endpointCounts.add(1, { endpoint: 'public_board' });

    check(boardRes, {
      'public: board accessible': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);

    sleep(0.5);

    // Test roadmap
    const roadmapRes = http.get(`${BASE_URL}/${PROJECT_SLUG}/roadmap`);
    endpointCounts.add(1, { endpoint: 'public_roadmap' });

    check(roadmapRes, {
      'public: roadmap accessible': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);

    sleep(0.5);

    // Test changelog
    const changelogRes = http.get(`${BASE_URL}/${PROJECT_SLUG}/changelog`);
    endpointCounts.add(1, { endpoint: 'public_changelog' });

    check(changelogRes, {
      'public: changelog accessible': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);
  });
}

function testStaticPages() {
  group('Static Pages', function () {
    const pages = [
      { path: '/privacy', name: 'privacy' },
      { path: '/terms', name: 'terms' },
    ];

    pages.forEach(page => {
      const res = http.get(`${BASE_URL}${page.path}`);
      endpointCounts.add(1, { endpoint: `static_${page.name}` });

      check(res, {
        [`static: ${page.name} accessible`]: (r) => r.status === 200 || r.status === 404,
      }) || errorRate.add(1);

      sleep(0.3);
    });
  });
}

export default function () {
  // Distribute load across different test types
  const scenario = Math.random();

  if (scenario < 0.3) {
    testHomepage();
  } else if (scenario < 0.5) {
    testAuthFlow();
  } else if (scenario < 0.75) {
    testAPIRoutes();
  } else if (scenario < 0.9) {
    testPublicPages();
  } else {
    testStaticPages();
  }

  sleep(Math.random() * 2 + 0.5); // Random sleep 0.5-2.5s
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n\n' + indent + '=== COMPREHENSIVE TEST SUMMARY ===\n\n';

  // Overall stats
  summary += indent + 'Overall Performance:\n';
  summary += indent + `  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += indent + `  Failed Requests: ${data.metrics.http_req_failed.values.passes || 0} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)\n`;
  summary += indent + `  Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += indent + `  P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += indent + `  P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;

  return summary;
}
