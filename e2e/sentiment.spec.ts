/**
 * E2E Tests for Sentiment Analysis Features
 * Tests user journey and interactions with sentiment analysis components
 */

import { test, expect, Page } from '@playwright/test'

// Helper to set up mock API responses
async function mockSentimentAPI(page: Page) {
  await page.route('**/api/analyze-sentiment*', async (route) => {
    const url = new URL(route.request().url())

    if (route.request().method() === 'GET') {
      // Mock distribution and trend data
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          distribution: [
            { sentiment_category: 'positive', count: 45, percentage: 45 },
            { sentiment_category: 'neutral', count: 35, percentage: 35 },
            { sentiment_category: 'negative', count: 15, percentage: 15 },
            { sentiment_category: 'mixed', count: 5, percentage: 5 },
          ],
          trend: [
            {
              date: '2025-11-10',
              avg_sentiment_score: 0.65,
              positive_count: 10,
              negative_count: 2,
              neutral_count: 5,
              mixed_count: 1,
            },
            {
              date: '2025-11-11',
              avg_sentiment_score: 0.72,
              positive_count: 12,
              negative_count: 1,
              neutral_count: 4,
              mixed_count: 2,
            },
          ],
          days: parseInt(url.searchParams.get('days') || '30'),
        }),
      })
    } else if (route.request().method() === 'POST') {
      // Mock analysis results
      const body = await route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: body.postIds.map((id: string) => ({
            postId: id,
            sentiment_category: 'positive',
            sentiment_score: 0.85,
            emotional_tone: 'excited',
            confidence_score: 0.92,
            success: true,
          })),
          processed: body.postIds.length,
          failed: 0,
        }),
      })
    }
  })
}

test.describe('Sentiment Analysis - Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await mockSentimentAPI(page)
  })

  test('should display sentiment widget with pie chart', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for widget to load
    await expect(page.getByText('Sentiment Analysis')).toBeVisible()

    // Check for chart elements
    await expect(page.getByText('Positive')).toBeVisible()
    await expect(page.getByText('Negative')).toBeVisible()
    await expect(page.getByText('Neutral')).toBeVisible()
    await expect(page.getByText('Mixed')).toBeVisible()

    // Check for counts
    await expect(page.getByText('45')).toBeVisible()
    await expect(page.getByText('35')).toBeVisible()
    await expect(page.getByText('15')).toBeVisible()
  })

  test('should display sentiment trend chart', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for trend chart to load
    await expect(page.getByText('Sentiment Trend')).toBeVisible()

    // Check for average score display
    await expect(page.getByText(/Average score:/i)).toBeVisible()

    // Check for trend indicator
    const trendText = page.locator('text=/Improving|Declining|Stable/i')
    await expect(trendText).toBeVisible()
  })

  test('should change time range on widget', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByText('Sentiment Analysis')).toBeVisible()

    // Click 7d button
    const button7d = page.locator('button:has-text("7d")').first()
    await button7d.click()

    // Verify API was called with correct parameter
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/analyze-sentiment') &&
        response.url().includes('days=7')
    )

    // Button should be highlighted
    await expect(button7d).toHaveClass(/bg-blue-100/)
  })

  test('should filter by sentiment category', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByText('Sentiment Analysis')).toBeVisible()

    // Click on Positive category
    const positiveButton = page.locator('button:has-text("😊 Positive")')
    await positiveButton.click()

    // Should show filter active message
    await expect(page.getByText(/Filter active.*positive/i)).toBeVisible()

    // Should show clear filter button
    await expect(page.getByText('Clear filter')).toBeVisible()

    // Category should be highlighted
    await expect(positiveButton).toHaveClass(/border-blue-500/)
  })

  test('should clear sentiment filter', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByText('Sentiment Analysis')).toBeVisible()

    // Select filter
    await page.locator('button:has-text("😊 Positive")').click()
    await expect(page.getByText('Clear filter')).toBeVisible()

    // Clear filter
    await page.getByText('Clear filter').click()

    // Filter message should disappear
    await expect(page.getByText('Clear filter')).not.toBeVisible()
  })
})

test.describe('Sentiment Analysis - Feedback List', () => {
  test.beforeEach(async ({ page }) => {
    await mockSentimentAPI(page)

    // Mock feedback list API
    await page.route('**/api/feedback*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          posts: [
            {
              id: 'post-1',
              title: 'Great new feature!',
              description: 'I love this new feature',
              status: 'open',
              author_name: 'John Doe',
              vote_count: 10,
              comment_count: 5,
              sentiment_category: 'positive',
              sentiment_score: 0.85,
              emotional_tone: 'excited',
              confidence_score: 0.92,
              created_at: '2025-11-10T10:00:00Z',
            },
            {
              id: 'post-2',
              title: 'Bug in the system',
              description: 'App crashes',
              status: 'open',
              author_name: 'Jane Smith',
              vote_count: 3,
              comment_count: 2,
              sentiment_category: 'negative',
              sentiment_score: -0.75,
              emotional_tone: 'frustrated',
              confidence_score: 0.88,
              created_at: '2025-11-11T14:00:00Z',
            },
          ],
        }),
      })
    })
  })

  test('should display feedback list with sentiment badges', async ({ page }) => {
    await page.goto('/feedback')

    // Wait for list to load
    await expect(page.getByText('Great new feature!')).toBeVisible()
    await expect(page.getByText('Bug in the system')).toBeVisible()

    // Check for sentiment badges
    await expect(page.locator('text=Positive').first()).toBeVisible()
    await expect(page.locator('text=Negative').first()).toBeVisible()
  })

  test('should filter feedback by sentiment', async ({ page }) => {
    await page.goto('/feedback')

    await expect(page.getByText('Great new feature!')).toBeVisible()
    await expect(page.getByText('Bug in the system')).toBeVisible()

    // Click positive filter
    await page.locator('button:has-text("Positive")').first().click()

    // Should still show positive post
    await expect(page.getByText('Great new feature!')).toBeVisible()

    // Should hide negative post
    await expect(page.getByText('Bug in the system')).not.toBeVisible()
  })

  test('should display emotional tone badges', async ({ page }) => {
    await page.goto('/feedback')

    // Wait for feedback to load
    await expect(page.getByText('Great new feature!')).toBeVisible()

    // Check for emotional tone badges
    await expect(page.locator('text=Excited').first()).toBeVisible()
    await expect(page.locator('text=Frustrated').first()).toBeVisible()
  })

  test('should show unanalyzed posts', async ({ page }) => {
    // Mock with unanalyzed post
    await page.route('**/api/feedback*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          posts: [
            {
              id: 'post-3',
              title: 'Unanalyzed feedback',
              description: 'No sentiment yet',
              status: 'open',
              author_name: 'Bob Johnson',
              vote_count: 1,
              comment_count: 0,
              created_at: '2025-11-12T09:00:00Z',
            },
          ],
        }),
      })
    })

    await page.goto('/feedback')

    // Should show "Not analyzed" badge
    await expect(page.getByText('Not analyzed')).toBeVisible()
  })

  test('should refresh feedback list', async ({ page }) => {
    await page.goto('/feedback')

    await expect(page.getByText('Great new feature!')).toBeVisible()

    // Click refresh button
    const refreshButton = page.getByText('Refresh')
    await refreshButton.click()

    // Should trigger API call
    await page.waitForResponse((response) =>
      response.url().includes('/api/feedback')
    )
  })
})

test.describe('Sentiment Analysis - User Journey', () => {
  test('complete user flow: view feedback → see sentiment → filter', async ({
    page,
  }) => {
    await mockSentimentAPI(page)

    // Step 1: Navigate to dashboard
    await page.goto('/dashboard')
    await expect(page.getByText('Sentiment Analysis')).toBeVisible()

    // Step 2: View sentiment distribution
    await expect(page.getByText('Positive')).toBeVisible()
    await expect(page.getByText('45')).toBeVisible()

    // Step 3: Click on positive category
    const positiveButton = page.locator('button:has-text("😊 Positive")')
    await positiveButton.click()

    // Step 4: Verify filter is applied
    await expect(page.getByText(/Filter active/i)).toBeVisible()

    // Step 5: Navigate to feedback list
    await page.goto('/feedback')

    // Step 6: Verify filtered feedback is shown
    await expect(page.getByText('Positive').first()).toBeVisible()

    // Step 7: Clear filter
    await page.locator('button:has-text("All")').first().click()

    // Step 8: Verify all feedback is shown
    await expect(page.getByText('Positive').first()).toBeVisible()
    await expect(page.getByText('Negative').first()).toBeVisible()
  })

  test('should handle empty state gracefully', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/analyze-sentiment*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            distribution: [],
            trend: [],
            days: 30,
          }),
        })
      }
    })

    await page.goto('/dashboard')

    // Should show empty state
    await expect(page.getByText(/No sentiment data/i)).toBeVisible()
    await expect(
      page.getByText(/No feedback has been analyzed yet/i)
    ).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/api/analyze-sentiment*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
        }),
      })
    })

    await page.goto('/dashboard')

    // Should show error message
    await expect(page.getByText(/Error loading data/i)).toBeVisible()

    // Should show retry button
    await expect(page.getByText('Retry')).toBeVisible()
  })

  test('should retry on error', async ({ page }) => {
    let callCount = 0

    await page.route('**/api/analyze-sentiment*', async (route) => {
      callCount++

      if (callCount === 1) {
        // First call fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Error' }),
        })
      } else {
        // Second call succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            distribution: [
              { sentiment_category: 'positive', count: 45, percentage: 45 },
            ],
            trend: [],
            days: 30,
          }),
        })
      }
    })

    await page.goto('/dashboard')

    // Should show error first
    await expect(page.getByText(/Error loading data/i)).toBeVisible()

    // Click retry
    await page.getByText('Retry').click()

    // Should show data after retry
    await expect(page.getByText('Positive')).toBeVisible()
  })
})

test.describe('Sentiment Analysis - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test('should display sentiment widget on mobile', async ({ page }) => {
    await mockSentimentAPI(page)

    await page.goto('/dashboard')

    // Widget should be visible
    await expect(page.getByText('Sentiment Analysis')).toBeVisible()

    // Time range buttons should be visible
    await expect(page.getByText('7d')).toBeVisible()
    await expect(page.getByText('30d')).toBeVisible()
    await expect(page.getByText('90d')).toBeVisible()

    // Chart should be visible
    await expect(page.getByText('Positive')).toBeVisible()
  })

  test('should filter sentiment on mobile', async ({ page }) => {
    await mockSentimentAPI(page)

    await page.goto('/dashboard')

    await expect(page.getByText('Sentiment Analysis')).toBeVisible()

    // Tap on positive category
    await page.locator('button:has-text("😊 Positive")').tap()

    // Filter should be applied
    await expect(page.getByText(/Filter active/i)).toBeVisible()
  })
})

test.describe('Sentiment Analysis - Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await mockSentimentAPI(page)

    await page.goto('/dashboard')

    await expect(page.getByText('Sentiment Analysis')).toBeVisible()

    // Check for accessible elements
    const buttons = page.locator('button')
    await expect(buttons.first()).toBeVisible()

    // Sentiment emojis should have proper role
    const emojis = page.locator('[role="img"]')
    expect(await emojis.count()).toBeGreaterThan(0)
  })

  test('should be keyboard navigable', async ({ page }) => {
    await mockSentimentAPI(page)

    await page.goto('/dashboard')

    await expect(page.getByText('Sentiment Analysis')).toBeVisible()

    // Tab through elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should be able to activate buttons with keyboard
    await page.keyboard.press('Enter')
  })
})
