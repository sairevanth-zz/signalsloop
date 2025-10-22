# Load Testing Scripts

These scripts use k6 to load test the SignalsLoop application.

## Prerequisites

Install k6:
```bash
brew install k6
```

## Scripts

### 1. Production Load Test (`prod-load-test.js`)
Realistic production load simulation with gradual ramp-up.

**Run against production:**
```bash
k6 run load-tests/prod-load-test.js
```

**Run against custom URL:**
```bash
BASE_URL=https://your-domain.com k6 run load-tests/prod-load-test.js
```

**Scenarios:**
- 60% homepage visitors
- 30% API consumers (posts endpoint)
- 10% dashboard access attempts

**Load profile:**
- Ramps from 0 → 50 concurrent users over 6 minutes
- Holds at 50 users for 2 minutes
- Ramps down over 1.5 minutes
- Total duration: ~7 minutes

**Thresholds:**
- p95 response time < 2s
- Error rate < 5%

---

### 2. API Stress Test (`api-stress-test.js`)
Aggressive stress test focused on API endpoints.

**Run:**
```bash
PROJECT_SLUG=demo k6 run load-tests/api-stress-test.js
```

**Run against custom project:**
```bash
BASE_URL=https://signalsloop.com PROJECT_SLUG=your-project k6 run load-tests/api-stress-test.js
```

**Load profile:**
- Ramps from 0 → 150 concurrent users over 7 minutes
- Total duration: ~10 minutes

**Thresholds:**
- p95 response time < 3s
- Error rate < 10% (allows for rate limiting at peak)

---

## Interpreting Results

### Key Metrics

**HTTP Request Duration:**
- `avg`: Average response time
- `p(95)`: 95th percentile (95% of requests faster than this)
- `p(99)`: 99th percentile

**HTTP Request Failed:**
- Percentage of failed requests (non-2xx/3xx status codes)

**Custom Metrics:**
- `errors`: Rate of failed checks (validation failures)
- `api_duration`: Trend of API response times

### Good Results
- ✅ p95 < 2s for production load test
- ✅ Error rate < 5%
- ✅ No timeouts or connection errors

### Warning Signs
- ⚠️  p95 > 3s
- ⚠️  Error rate > 5%
- ⚠️  Increasing trend in response times under sustained load

### Critical Issues
- ❌ p95 > 5s
- ❌ Error rate > 10%
- ❌ Timeouts or connection pool exhaustion

---

## Example Output

```
scenarios: (100.00%) 1 scenario, 50 max VUs, 10m30s max duration

✓ homepage status is 200
✓ posts API status is 200
✓ posts API returns valid JSON

checks.........................: 98.50% ✓ 2955    ✗ 45
data_received..................: 8.5 MB 1.4 MB/s
data_sent......................: 250 kB 42 kB/s
http_req_duration..............: avg=245ms  p(95)=892ms  p(99)=1.2s
http_req_failed................: 1.50%  ✓ 45      ✗ 2955
http_reqs......................: 3000   500/s
```

---

## Troubleshooting

**High error rates:**
- Check rate limiting configuration
- Verify database connection pooling
- Check server resource usage (CPU, memory)

**Slow response times:**
- Enable caching where appropriate
- Add database indexes
- Check for N+1 queries
- Verify CDN configuration

**Connection errors:**
- Check server capacity
- Verify network configuration
- Check for connection pool exhaustion
