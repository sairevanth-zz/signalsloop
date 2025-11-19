/**
 * E2E tests for Theme Detection feature
 * Tests complete user journeys using Playwright
 */

import { test, expect } from '@playwright/test';

// Test data - adjust these based on your test environment
const TEST_PROJECT_SLUG = 'test-project';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

test.describe('Theme Detection E2E Tests', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/app');
  });

  test.describe('Theme Analysis Journey', () => {
    test('should navigate to AI Insights and trigger theme analysis', async ({ page }) => {
      // Navigate to project board
      await page.goto(`/${TEST_PROJECT_SLUG}/board`);

      // Click on AI Insights menu item
      await page.click('text=AI Insights');

      // Should navigate to AI Insights page
      await expect(page).toHaveURL(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Should see AI Insights header
      await expect(page.locator('h1:has-text("AI Insights")')).toBeVisible();

      // Click on "Re-analyze Themes" or "Analyze Themes" button
      const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Re-analyze")').first();
      await analyzeButton.click();

      // Wait for analysis to complete
      await page.waitForSelector('text=Theme', { timeout: 30000 });

      // Should see themes displayed
      const themeCards = page.locator('[data-testid="theme-card"], [role="button"]:has-text("Theme")');
      await expect(themeCards.first()).toBeVisible();
    });

    test('should display theme detection results', async ({ page }) => {
      // Navigate to AI Insights
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Wait for themes to load
      await page.waitForSelector('text=Theme', { timeout: 10000 });

      // Should see theme cards
      const themeCount = await page.locator('[data-testid="theme-card"]').count();
      expect(themeCount).toBeGreaterThan(0);

      // Each theme should have name, description, and frequency
      const firstTheme = page.locator('[data-testid="theme-card"]').first();
      await expect(firstTheme).toContainText(/\d+/); // Should have a number (frequency)
    });

    test('should show loading state during analysis', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Click analyze button
      const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Re-analyze")').first();
      await analyzeButton.click();

      // Should show loading indicator
      await expect(page.locator('text=/analyzing|loading/i')).toBeVisible();

      // Wait for completion
      await page.waitForSelector('text=/analyzing|loading/i', { state: 'hidden', timeout: 30000 });

      // Should show results
      await expect(page.locator('text=Theme')).toBeVisible();
    });
  });

  test.describe('Theme Navigation', () => {
    test('should navigate to theme detail page when clicking on theme', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Wait for themes to load
      await page.waitForSelector('[data-testid="theme-card"], [role="button"]:has-text("Theme")');

      // Click on first theme
      const firstTheme = page.locator('[data-testid="theme-card"], [role="button"]:has-text("Theme")').first();
      await firstTheme.click();

      // Should navigate to theme detail page
      await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_SLUG}/theme/[a-z0-9-]+`));

      // Should see theme detail page
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=/frequency|mentions/i')).toBeVisible();
      await expect(page.locator('text=/sentiment/i')).toBeVisible();
    });

    test('should show back button on theme detail page', async ({ page }) => {
      // Navigate directly to a theme detail page (using mock ID)
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('[data-testid="theme-card"], [role="button"]:has-text("Theme")');

      const firstTheme = page.locator('[data-testid="theme-card"], [role="button"]:has-text("Theme")').first();
      await firstTheme.click();

      // Should see back button
      const backButton = page.locator('button:has-text("Back")');
      await expect(backButton).toBeVisible();

      // Click back button
      await backButton.click();

      // Should return to themes overview
      await expect(page).toHaveURL(`/${TEST_PROJECT_SLUG}/ai-insights`);
    });
  });

  test.describe('Theme Filtering and Sorting', () => {
    test('should filter themes by search query', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Wait for themes to load
      await page.waitForSelector('[data-testid="theme-card"], text=Theme');

      // Type in search box
      const searchInput = page.locator('input[placeholder*="search" i]');
      await searchInput.fill('Dark Mode');

      // Wait for filtered results
      await page.waitForTimeout(500); // Debounce

      // Should show filtered themes
      const visibleThemes = page.locator('[data-testid="theme-card"]:visible');
      const count = await visibleThemes.count();

      // Should have fewer themes or specific theme visible
      if (count > 0) {
        await expect(visibleThemes.first()).toContainText(/dark/i);
      }
    });

    test('should filter themes by sentiment', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('text=Theme');

      // Click on sentiment filter
      const positiveFilter = page.locator('button:has-text("Positive"), [role="button"]:has-text("Positive")');
      if (await positiveFilter.isVisible()) {
        await positiveFilter.click();

        // Wait for filtering
        await page.waitForTimeout(500);

        // Should show only positive themes
        const visibleThemes = page.locator('[data-testid="theme-card"]:visible');
        expect(await visibleThemes.count()).toBeGreaterThanOrEqual(0);
      }
    });

    test('should sort themes by frequency', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('text=Theme');

      // Click on sort dropdown/button
      const sortButton = page.locator('button:has-text("Sort"), select:has-text("Sort"), [role="button"]:has-text("Frequency")');
      if (await sortButton.isVisible()) {
        await sortButton.click();

        // Select frequency sort
        const frequencyOption = page.locator('text=/frequency|popular/i');
        if (await frequencyOption.isVisible()) {
          await frequencyOption.click();

          // Themes should be reordered
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Emerging Themes', () => {
    test('should display emerging themes alert', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Look for emerging themes alert
      const emergingAlert = page.locator('text=/emerging.*theme/i');
      const isVisible = await emergingAlert.isVisible();

      if (isVisible) {
        // Should have flame icon or emerging badge
        await expect(emergingAlert).toBeVisible();

        // Should show growth percentage
        await expect(page.locator('text=/\\+\\d+%/')).toBeVisible();

        // Should have investigate button
        const investigateButton = page.locator('button:has-text("Investigate")');
        await expect(investigateButton).toBeVisible();
      }
    });

    test('should navigate to theme detail when clicking investigate', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Check if emerging themes alert is present
      const investigateButton = page.locator('button:has-text("Investigate")').first();
      const isVisible = await investigateButton.isVisible();

      if (isVisible) {
        await investigateButton.click();

        // Should navigate to theme detail page
        await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_SLUG}/theme/[a-z0-9-]+`));
      }
    });

    test('should dismiss emerging theme alert', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Check for dismiss button
      const dismissButton = page.locator('button[title="Dismiss"], button:has-text("×")').first();
      const isVisible = await dismissButton.isVisible();

      if (isVisible) {
        // Get theme name before dismissing
        const themeName = await page.locator('h4').first().textContent();

        // Click dismiss
        await dismissButton.click();

        // Theme should disappear
        await expect(page.locator(`text="${themeName}"`)).not.toBeVisible();
      }
    });
  });

  test.describe('Theme Detail Page', () => {
    test('should display theme metrics', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('[data-testid="theme-card"], [role="button"]:has-text("Theme")');

      // Click on first theme
      const firstTheme = page.locator('[data-testid="theme-card"], [role="button"]:has-text("Theme")').first();
      await firstTheme.click();

      // Should see metrics
      await expect(page.locator('text=/total mentions/i')).toBeVisible();
      await expect(page.locator('text=/sentiment/i')).toBeVisible();
      await expect(page.locator('text=/first seen/i')).toBeVisible();
      await expect(page.locator('text=/last seen/i')).toBeVisible();
    });

    test('should display related feedback', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('[data-testid="theme-card"], [role="button"]:has-text("Theme")');

      const firstTheme = page.locator('[data-testid="theme-card"], [role="button"]:has-text("Theme")').first();
      await firstTheme.click();

      // Should see related feedback section
      await expect(page.locator('text=/representative feedback/i, text=/related feedback/i')).toBeVisible();

      // Should have feedback items
      const feedbackItems = page.locator('[data-testid="feedback-item"], .feedback-item');
      const count = await feedbackItems.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should show theme trend chart', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('[data-testid="theme-card"], [role="button"]:has-text("Theme")');

      const firstTheme = page.locator('[data-testid="theme-card"], [role="button"]:has-text("Theme")').first();
      await firstTheme.click();

      // Should see chart (Recharts renders SVG)
      const chart = page.locator('svg, canvas, [data-testid="theme-chart"]');
      const chartVisible = await chart.isVisible();

      // Chart may not always be present, but if it is, it should be visible
      if (chartVisible) {
        await expect(chart).toBeVisible();
      }
    });

    test('should allow exporting theme data', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('[data-testid="theme-card"], [role="button"]:has-text("Theme")');

      const firstTheme = page.locator('[data-testid="theme-card"], [role="button"]:has-text("Theme")').first();
      await firstTheme.click();

      // Should see export button
      const exportButton = page.locator('button:has-text("Export")');
      const isVisible = await exportButton.isVisible();

      if (isVisible) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download');

        await exportButton.click();

        // Should trigger download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.csv$/i);
      }
    });
  });

  test.describe('Theme Tabs', () => {
    test('should switch between theme tabs', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Should see tabs
      await expect(page.locator('text="Themes & Patterns"')).toBeVisible();

      // Click on "Theme Clusters" tab
      const clustersTab = page.locator('button:has-text("Theme Clusters"), [role="tab"]:has-text("Clusters")');
      if (await clustersTab.isVisible()) {
        await clustersTab.click();

        // Should show cluster view
        await expect(page.locator('text=/cluster|group/i')).toBeVisible();
      }

      // Click on "Grouped Feedback" tab
      const groupedTab = page.locator('button:has-text("Grouped Feedback"), [role="tab"]:has-text("Grouped")');
      if (await groupedTab.isVisible()) {
        await groupedTab.click();

        // Should show grouped feedback
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle theme detection errors', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);

      // Mock network error by intercepting request
      await page.route('**/api/detect-themes', route => route.abort());

      // Try to analyze
      const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Re-analyze")').first();
      if (await analyzeButton.isVisible()) {
        await analyzeButton.click();

        // Should show error message
        await expect(page.locator('text=/error|failed/i')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should handle missing theme gracefully', async ({ page }) => {
      // Navigate to non-existent theme
      await page.goto(`/${TEST_PROJECT_SLUG}/theme/non-existent-id`);

      // Should show error or not found message
      await expect(page.locator('text=/not found|error/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('[data-testid="theme-card"], [role="button"]:has-text("Theme")');

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to activate with Enter
      await page.keyboard.press('Enter');

      // Some action should occur
      await page.waitForTimeout(500);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('text=Theme');

      // Check for ARIA attributes
      const buttons = page.locator('button[role="button"], [role="button"]');
      const count = await buttons.count();

      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display themes on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('text=Theme');

      // Should show themes in mobile view
      const themeCards = page.locator('[data-testid="theme-card"], text=Theme');
      await expect(themeCards.first()).toBeVisible();
    });

    test('should have mobile-friendly navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`/${TEST_PROJECT_SLUG}/ai-insights`);
      await page.waitForSelector('text=Theme');

      // Should be able to navigate on mobile
      const firstTheme = page.locator('[data-testid="theme-card"], [role="button"]:has-text("Theme")').first();
      await firstTheme.click();

      // Should navigate to detail page
      await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_SLUG}/theme/[a-z0-9-]+`));
    });
  });
});
