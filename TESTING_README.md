# Testing Guide for Sentiment Analysis Engine

This document provides comprehensive information about testing the Sentiment Analysis Engine.

## Table of Contents

- [Overview](#overview)
- [Test Setup](#test-setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Continuous Integration](#continuous-integration)

## Overview

The Sentiment Analysis Engine has comprehensive test coverage including:

- **Unit Tests**: Test individual functions and logic
- **Component Tests**: Test React components in isolation
- **Integration Tests**: Test complete workflows
- **E2E Tests**: Test user journeys in a real browser

**Target Coverage**: 80%+ across all metrics (branches, functions, lines, statements)

## Test Setup

### Install Test Dependencies

```bash
# Install Jest and React Testing Library
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Install Playwright for E2E tests
npm install --save-dev @playwright/test

# Install browsers for Playwright
npx playwright install
```

### Configuration Files

- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test environment setup and global mocks
- `playwright.config.ts` - Playwright E2E test configuration

## Running Tests

### All Tests

```bash
# Run all Jest tests (unit, component, integration)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Specific Test Suites

```bash
# Run only unit tests
npm run test:unit

# Run only component tests
npm run test:components

# Run only integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests in specific browser
npm run test:e2e -- --project=chromium
```

### Debugging Tests

```bash
# Run tests in debug mode
npm run test:debug

# Run specific test file
npm test -- sentiment.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should analyze positive"

# Debug Playwright tests
npm run test:e2e:debug
```

## Test Structure

```
signalsloop/
├── __tests__/
│   ├── sentiment.test.ts              # Unit tests for sentiment service
│   ├── integration/
│   │   └── sentiment-flow.test.ts     # Integration tests
│   ├── mocks/
│   │   ├── openai.mock.ts            # OpenAI API mocks
│   │   └── supabase.mock.ts          # Supabase client mocks
│   └── utils/
│       ├── test-utils.tsx            # Test utilities and helpers
│       └── fixtures.ts               # Test data fixtures
├── src/components/sentiment/__tests__/
│   ├── SentimentBadge.test.tsx       # Component tests
│   ├── SentimentWidget.test.tsx
│   ├── SentimentTrendChart.test.tsx
│   └── FeedbackListWithSentiment.test.tsx
├── e2e/
│   └── sentiment.spec.ts             # E2E tests
├── jest.config.js
├── jest.setup.js
└── playwright.config.ts
```

## Test Coverage

### Current Coverage Goals

| Metric | Target | Description |
|--------|--------|-------------|
| Branches | 80% | All code branches covered |
| Functions | 80% | All functions tested |
| Lines | 80% | All lines executed |
| Statements | 80% | All statements covered |

### View Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage by Module

#### Sentiment Service (`lib/openai/sentiment.ts`)
- ✅ `analyzeSentiment()` - Positive, negative, neutral, mixed cases
- ✅ `analyzeSentimentWithRetry()` - Retry logic and failures
- ✅ `analyzeSentimentBatch()` - Batch processing
- ✅ `detectSentimentQuick()` - Quick keyword detection
- ✅ Error handling and edge cases

#### API Routes (`app/api/analyze-sentiment/route.ts`)
- ✅ POST endpoint - Analysis requests
- ✅ GET endpoint - Distribution and trends
- ✅ Rate limiting
- ✅ Database integration
- ✅ Error responses

#### Components
- ✅ `SentimentBadge` - All variants and props
- ✅ `SentimentWidget` - Chart, filters, time ranges
- ✅ `SentimentTrendChart` - Trend display and interactions
- ✅ `FeedbackListWithSentiment` - Real-time updates, filtering

## Writing Tests

### Unit Test Example

```typescript
import { analyzeSentiment } from '@/lib/openai/sentiment'

describe('analyzeSentiment', () => {
  it('should analyze positive sentiment', async () => {
    const result = await analyzeSentiment({
      text: 'I love this feature!',
      postId: 'post-1',
    })

    expect(result.sentiment_category).toBe('positive')
    expect(result.sentiment_score).toBeGreaterThan(0)
  })
})
```

### Component Test Example

```typescript
import { render, screen } from '@/__tests__/utils/test-utils'
import { SentimentBadge } from '../SentimentBadge'

describe('SentimentBadge', () => {
  it('should render positive badge', () => {
    render(<SentimentBadge sentiment_category="positive" />)
    expect(screen.getByText('Positive')).toBeInTheDocument()
  })
})
```

### Integration Test Example

```typescript
import { POST } from '@/app/api/analyze-sentiment/route'
import { NextRequest } from 'next/server'

describe('Sentiment API Integration', () => {
  it('should analyze and store results', async () => {
    const request = new NextRequest('http://localhost/api/analyze-sentiment', {
      method: 'POST',
      body: JSON.stringify({ postIds: ['post-1'] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.results).toHaveLength(1)
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should display sentiment widget', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText('Sentiment Analysis')).toBeVisible()
  await expect(page.getByText('Positive')).toBeVisible()
})
```

## Test Utilities

### Mocks

#### OpenAI Mock
```typescript
import { createMockOpenAIClient } from '__tests__/mocks/openai.mock'

// Returns mock responses based on input text
const mockClient = createMockOpenAIClient()
```

#### Supabase Mock
```typescript
import { createMockSupabaseClient } from '__tests__/mocks/supabase.mock'

// Returns mock data and handles subscriptions
const mockClient = createMockSupabaseClient()
```

### Test Fixtures

```typescript
import { testFeedbackTexts, mockPosts } from '__tests__/utils/fixtures'

// Pre-defined test data
const positiveText = testFeedbackTexts.positive
const mockPostData = mockPostsWithSentiment
```

### Custom Render

```typescript
import { render } from '__tests__/utils/test-utils'

// Includes all necessary providers
render(<YourComponent />)
```

## Best Practices

### 1. Test Behavior, Not Implementation

❌ Bad:
```typescript
expect(component.state.loading).toBe(false)
```

✅ Good:
```typescript
expect(screen.queryByRole('status')).not.toBeInTheDocument()
```

### 2. Use Data Test IDs Sparingly

❌ Bad:
```typescript
expect(screen.getByTestId('sentiment-badge-123')).toBeInTheDocument()
```

✅ Good:
```typescript
expect(screen.getByText('Positive')).toBeInTheDocument()
```

### 3. Mock External Dependencies

Always mock:
- API calls (fetch, OpenAI, Supabase)
- Browser APIs (IntersectionObserver, ResizeObserver)
- Date/time functions
- Random number generators

### 4. Test Edge Cases

Always test:
- Empty states
- Error states
- Loading states
- Boundary values
- Invalid inputs
- Network failures

### 5. Keep Tests Isolated

```typescript
beforeEach(() => {
  jest.clearAllMocks()
  // Reset any shared state
})
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:e2e
```

### Pre-commit Hook

```bash
# .husky/pre-commit
npm test -- --bail --findRelatedTests
```

## Troubleshooting

### Common Issues

#### Tests timing out
```bash
# Increase timeout
npm test -- --testTimeout=10000
```

#### Mock not working
```typescript
// Ensure mock is hoisted
jest.mock('@/lib/module', () => ({
  // mock implementation
}))
```

#### Playwright browser not found
```bash
# Reinstall browsers
npx playwright install
```

#### Coverage not meeting threshold
```bash
# Check uncovered lines
npm run test:coverage
# Review coverage/lcov-report/index.html
```

### Debug Mode

```bash
# Jest debug
node --inspect-brk node_modules/.bin/jest --runInBand

# Playwright debug
PWDEBUG=1 npm run test:e2e
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure 80%+ coverage
3. Test edge cases
4. Add E2E tests for user flows
5. Update this documentation
6. Run full test suite before committing

## Questions?

For questions about testing, please refer to the main project documentation or contact the development team.
