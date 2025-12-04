/**
 * E2E tests for Stakeholder Intelligence feature
 */

import { test, expect } from '@playwright/test';

test.describe('Stakeholder Intelligence', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Set up authentication and navigate to project
    // This assumes you have a test project set up
    // Adjust the URL based on your test environment
  });

  test('should display the stakeholder intelligence page', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Check for main heading
    await expect(page.getByText('Stakeholder Intelligence')).toBeVisible();

    // Check for role selector
    await expect(page.getByRole('combobox')).toBeVisible();

    // Check for query input
    await expect(page.getByPlaceholder(/Ask anything about your product/)).toBeVisible();
  });

  test('should show role-specific example queries', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Select CEO role
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'CEO' }).click();

    // Should show CEO-specific examples
    await expect(page.getByText(/competitive threats/i)).toBeVisible();

    // Switch to Sales role
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Sales' }).click();

    // Should show Sales-specific examples
    await expect(page.getByText(/new features can I sell/i)).toBeVisible();
  });

  test('should allow clicking example queries', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Click an example query
    const exampleQuery = page.getByText(/What are the top/i).first();
    await exampleQuery.click();

    // Query should populate in textarea
    const textarea = page.getByPlaceholder(/Ask anything about your product/);
    await expect(textarea).not.toHaveValue('');
  });

  test('should submit a query and show loading state', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Enter a query
    const textarea = page.getByPlaceholder(/Ask anything about your product/);
    await textarea.fill('What are the top customer issues?');

    // Submit query
    const submitButton = page.getByRole('button', { name: /Ask/i });
    await submitButton.click();

    // Should show loading state
    await expect(page.getByText(/Analyzing your question/i)).toBeVisible();
  });

  test('should display response components after query', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Submit a query
    await page.getByPlaceholder(/Ask anything about your product/).fill('Show me sentiment trends');
    await page.getByRole('button', { name: /Ask/i }).click();

    // Wait for response
    await page.waitForSelector('[class*="SummaryText"]', { timeout: 10000 });

    // Should show multiple components
    const components = await page.locator('[data-testid*="component"]').count();
    expect(components).toBeGreaterThanOrEqual(3);
  });

  test('should display follow-up questions', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Submit a query
    await page.getByPlaceholder(/Ask anything about your product/).fill('What features should we prioritize?');
    await page.getByRole('button', { name: /Ask/i }).click();

    // Wait for response
    await page.waitForSelector('text=Follow-up questions', { timeout: 10000 });

    // Should show follow-up questions
    await expect(page.getByText(/Follow-up questions/i)).toBeVisible();

    // Follow-up questions should be clickable
    const followUpButton = page.locator('text=/Which customers/').first();
    await expect(followUpButton).toBeVisible();
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Make many rapid requests (21 to exceed per-minute limit)
    for (let i = 0; i < 21; i++) {
      await page.getByPlaceholder(/Ask anything about your product/).fill(`Query ${i}`);
      await page.getByRole('button', { name: /Ask/i }).click();
      await page.waitForTimeout(100);
    }

    // Should show rate limit error
    await expect(page.getByText(/rate limit/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show metadata about response', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Submit a query
    await page.getByPlaceholder(/Ask anything about your product/).fill('Show me recent feedback');
    await page.getByRole('button', { name: /Ask/i }).click();

    // Wait for response
    await page.waitForTimeout(5000);

    // Should show generation time
    await expect(page.getByText(/Generated in \d+ms/)).toBeVisible();

    // Should show model used
    await expect(page.getByText(/Powered by Claude Sonnet 4/)).toBeVisible();

    // Should show component count
    await expect(page.getByText(/\d+ components/)).toBeVisible();
  });

  test('should render chart components correctly', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Submit a query that should return charts
    await page.getByPlaceholder(/Ask anything about your product/).fill('Show me sentiment trends over time');
    await page.getByRole('button', { name: /Ask/i }).click();

    // Wait for chart to render
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });

    // Should have SVG chart elements
    const chartSvg = await page.locator('.recharts-wrapper svg').count();
    expect(chartSvg).toBeGreaterThan(0);
  });

  test('should expand/collapse feedback items', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Submit a query
    await page.getByPlaceholder(/Ask anything about your product/).fill('Show me recent customer feedback');
    await page.getByRole('button', { name: /Ask/i }).click();

    // Wait for feedback list
    await page.waitForTimeout(5000);

    // Find expand button
    const expandButton = page.locator('[aria-label="Expand feedback"]').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();

      // Should show expanded content
      await expect(page.locator('.whitespace-pre-wrap').first()).toBeVisible();
    }
  });

  test('should handle empty states gracefully', async ({ page }) => {
    await page.goto('/dashboard/empty-project/stakeholder');

    // Submit a query for project with no data
    await page.getByPlaceholder(/Ask anything about your product/).fill('Show me feedback');
    await page.getByRole('button', { name: /Ask/i }).click();

    // Wait for response
    await page.waitForTimeout(5000);

    // Should show empty state message
    await expect(page.getByText(/No feedback items available/i)).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard/test-project-id/stakeholder');

    // Main elements should still be visible
    await expect(page.getByText('Stakeholder Intelligence')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();

    // Textarea should be usable
    const textarea = page.getByPlaceholder(/Ask anything about your product/);
    await expect(textarea).toBeVisible();
    await textarea.fill('Test query');

    // Submit button should be accessible
    await expect(page.getByRole('button', { name: /Ask/i })).toBeVisible();
  });

  test('should persist query history in session', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Submit first query
    await page.getByPlaceholder(/Ask anything about your product/).fill('First query');
    await page.getByRole('button', { name: /Ask/i }).click();
    await page.waitForTimeout(3000);

    // Submit second query
    await page.getByPlaceholder(/Ask anything about your product/).fill('Second query');
    await page.getByRole('button', { name: /Ask/i }).click();
    await page.waitForTimeout(3000);

    // Both queries should be visible on page
    await expect(page.getByText('First query')).toBeVisible();
    await expect(page.getByText('Second query')).toBeVisible();
  });

  test('should show visual components (charts, clouds)', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Query that should trigger visual components
    await page.getByPlaceholder(/Ask anything about your product/).fill('What are customers saying?');
    await page.getByRole('button', { name: /Ask/i }).click();

    // Wait for response
    await page.waitForTimeout(5000);

    // Should have at least 2 visual components (per requirement)
    const charts = await page.locator('.recharts-wrapper, [data-testid*="chart"]').count();
    const clouds = await page.locator('[data-testid*="cloud"], .theme-cloud').count();

    expect(charts + clouds).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Stakeholder Intelligence - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Tab to role selector
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox')).toBeFocused();

    // Tab to textarea
    await page.keyboard.press('Tab');
    await expect(page.getByPlaceholder(/Ask anything about your product/)).toBeFocused();

    // Tab to submit button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /Ask/i })).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard/test-project-id/stakeholder');

    // Role selector should have accessible name
    const roleSelector = page.getByRole('combobox');
    const accessibleName = await roleSelector.getAttribute('aria-label');
    expect(accessibleName).toBeTruthy();

    // Buttons should have accessible names
    const submitButton = page.getByRole('button', { name: /Ask/i });
    await expect(submitButton).toHaveAccessibleName();
  });
});
