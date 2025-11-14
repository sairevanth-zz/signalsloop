# Testing Guide for Theme Detection Feature

This document provides comprehensive information about testing the Theme & Pattern Detection Engine in SignalsLoop.

## Table of Contents

1. [Overview](#overview)
2. [Test Setup](#test-setup)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Test Structure](#test-structure)
6. [Writing Tests](#writing-tests)
7. [Continuous Integration](#continuous-integration)
8. [Troubleshooting](#troubleshooting)

## Overview

The Theme Detection feature has comprehensive test coverage across multiple testing layers:

- **Unit Tests**: Test individual functions and utilities
- **Component Tests**: Test React components in isolation
- **Integration Tests**: Test complete workflows and API endpoints
- **E2E Tests**: Test user journeys in a real browser

### Test Statistics

- **Total Test Files**: 10+
- **Total Test Cases**: 200+
- **Target Coverage**: 85%+ for business logic

## Test Setup

### Prerequisites

Install the required testing dependencies:

```bash
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest \
  jest-environment-jsdom \
  @playwright/test
```

### Configuration Files

The following configuration files have been created:

- `jest.config.js` - Jest configuration for unit and component tests
- `jest.setup.js` - Global test setup and mocks
- `playwright.config.ts` - Playwright configuration for E2E tests

## Running Tests

### Unit and Component Tests

Run all Jest tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm test -- --watch
```

Run tests with coverage:
```bash
npm test -- --coverage
```

Run specific test file:
```bash
npm test -- utils.test.ts
```

Run tests matching a pattern:
```bash
npm test -- --testNamePattern="should detect themes"
```

### Integration Tests

Run integration tests:
```bash
npm test -- integration
```

### E2E Tests

Install Playwright browsers (first time only):
```bash
npx playwright install
```

Run all E2E tests:
```bash
npx playwright test
```

Run E2E tests in UI mode:
```bash
npx playwright test --ui
```

Run E2E tests in headed mode:
```bash
npx playwright test --headed
```

Run specific E2E test file:
```bash
npx playwright test e2e/themes.spec.ts
```

Run tests on specific browser:
```bash
npx playwright test --project=chromium
```

### Debug Tests

Debug Jest tests:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Debug Playwright tests:
```bash
npx playwright test --debug
```

## Test Coverage

### Coverage Reports

Generate coverage report:
```bash
npm test -- --coverage
```

View coverage in browser:
```bash
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

### Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Business Logic (lib/themes/) | 85%+ |
| API Endpoints | 80%+ |
| React Components | 75%+ |
| Overall | 75%+ |

## Test Structure

### Directory Structure

```
signalsloop/
├── src/
│   ├── __tests__/
│   │   ├── mocks/
│   │   │   ├── theme-data.ts
│   │   │   ├── openai.ts
│   │   │   └── supabase.ts
│   │   └── integration/
│   │       └── theme-detection-flow.test.ts
│   ├── lib/
│   │   ├── themes/
│   │   │   └── __tests__/
│   │   │       ├── utils.test.ts
│   │   │       └── clustering.test.ts
│   │   └── openai/
│   │       └── __tests__/
│   │           └── themes.test.ts
│   └── components/
│       └── themes/
│           └── __tests__/
│               ├── ThemeCard.test.tsx
│               ├── ThemesOverview.test.tsx
│               └── EmergingThemesAlert.test.tsx
├── e2e/
│   └── themes.spec.ts
├── jest.config.js
├── jest.setup.js
└── playwright.config.ts
```

### Test File Naming

- Unit/Component Tests: `*.test.ts` or `*.test.tsx`
- Integration Tests: `*.test.ts` in `__tests__/integration/`
- E2E Tests: `*.spec.ts` in `e2e/`

## Writing Tests

### Unit Test Example

```typescript
import { isEmergingTheme } from '../utils';

describe('isEmergingTheme', () => {
  it('should identify emerging themes with high growth', () => {
    const theme: Theme = {
      ...mockTheme,
      frequency: 20,
      first_seen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const previousCount = 5; // 300% growth

    expect(isEmergingTheme(theme, previousCount)).toBe(true);
  });
});
```

### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeCard } from '../ThemeCard';

describe('ThemeCard', () => {
  it('should render theme information', () => {
    render(<ThemeCard theme={mockTheme} />);

    expect(screen.getByText(mockTheme.theme_name)).toBeInTheDocument();
    expect(screen.getByText(mockTheme.description)).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const mockOnClick = jest.fn();
    render(<ThemeCard theme={mockTheme} onClick={mockOnClick} />);

    const card = screen.getByText(mockTheme.theme_name);
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledWith(mockTheme);
  });
});
```

### Integration Test Example

```typescript
import { POST as detectThemesHandler } from '@/app/api/detect-themes/route';

describe('Theme Detection Flow', () => {
  it('should detect themes and store in database', async () => {
    const request = new NextRequest('http://localhost/api/detect-themes', {
      method: 'POST',
      body: JSON.stringify({ projectId: mockProjectId }),
    });

    const response = await detectThemesHandler(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.themes.length).toBeGreaterThan(0);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should analyze themes from feedback', async ({ page }) => {
  await page.goto('/test-project/ai-insights');

  await page.click('button:has-text("Analyze")');

  await expect(page.locator('text=Theme')).toBeVisible();
});
```

## Mock Data

### Using Mock Data

Mock data is available in `src/__tests__/mocks/`:

```typescript
import {
  mockThemes,
  mockFeedbackItems,
  mockDetectedThemes,
  mockProjectId,
} from '@/__tests__/mocks/theme-data';
```

### Mock Utilities

- **OpenAI Mock**: `createMockOpenAI()` - Mocks OpenAI API responses
- **Supabase Mock**: `createMockSupabaseClient()` - Mocks database operations
- **Large Dataset**: `mockLargeFeedbackDataset` - 120+ feedback items for load testing

## Best Practices

### Test Organization

1. **Arrange-Act-Assert Pattern**: Structure tests clearly
   ```typescript
   it('should do something', () => {
     // Arrange
     const input = setupInput();

     // Act
     const result = functionUnderTest(input);

     // Assert
     expect(result).toBe(expected);
   });
   ```

2. **Descriptive Test Names**: Use "should" statements
   ```typescript
   it('should filter positive themes when positive filter is selected', () => {
     // ...
   });
   ```

3. **Test One Thing**: Each test should verify one behavior

4. **Avoid Test Interdependence**: Tests should be independent

### Mocking

1. **Mock External Dependencies**: Always mock API calls, database queries
2. **Use Test Doubles**: Prefer mocks over real implementations
3. **Clear Mocks Between Tests**: Use `jest.clearAllMocks()` in `beforeEach`

### Coverage

1. **Test Edge Cases**: Empty arrays, null values, boundary conditions
2. **Test Error Paths**: Not just happy paths
3. **Test Async Code**: Use `async/await` properly
4. **Test User Interactions**: All clickable elements

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

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
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

#### Tests Failing Due to Missing Mocks

**Problem**: `Cannot find module '@/lib/supabase-client'`

**Solution**: Ensure `jest.setup.js` includes all necessary mocks

#### Async Tests Timing Out

**Problem**: Test hangs and times out

**Solution**:
- Ensure all promises are awaited
- Use `waitFor` for async UI updates
- Increase timeout if needed: `jest.setTimeout(10000)`

#### Playwright Tests Failing

**Problem**: Element not found

**Solution**:
- Use more specific selectors
- Add `waitForSelector` before interactions
- Check viewport size for mobile tests

#### Coverage Not Meeting Goals

**Problem**: Coverage below threshold

**Solution**:
- Identify uncovered lines with `--coverage`
- Add tests for edge cases
- Remove dead code

### Debug Tips

1. **Console Logs**: Use `console.log()` in tests (will show in output)
2. **Debug in VS Code**: Add breakpoints and use debugger
3. **Playwright Trace**: View detailed execution trace
   ```bash
   npx playwright test --trace on
   npx playwright show-trace trace.zip
   ```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For questions or issues with tests:
1. Check this documentation
2. Review existing test files for examples
3. Consult team members
4. File an issue with test reproduction

---

Last Updated: 2025-01-14
