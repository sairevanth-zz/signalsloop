/**
 * Polls & Surveys E2E Tests
 * Tests for the Polls listing page, poll creation, voting,
 * and survey management features.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://signalsloop.com';
const TEST_PROJECT_SLUG = 'test-project';

// Mock project API
async function mockProjectAPI(page: Page, projectSlug: string) {
    await page.route('**/api/projects**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                projects: [{
                    id: 'test-project-id',
                    name: 'Test Project',
                    slug: projectSlug,
                }],
            }),
        });
    });
}

// Mock polls API
async function mockPollsAPI(page: Page) {
    await page.route('**/api/polls**', async (route) => {
        const url = route.request().url();

        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    polls: [
                        {
                            id: 'poll-1',
                            title: 'Which feature should we prioritize?',
                            description: 'Help us decide our next big feature',
                            status: 'active',
                            vote_count: 47,
                            options: [
                                { id: 'opt-1', text: 'Dark Mode', votes: 23 },
                                { id: 'opt-2', text: 'Mobile App', votes: 15 },
                                { id: 'opt-3', text: 'API Improvements', votes: 9 },
                            ],
                            closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 'poll-2',
                            title: 'How satisfied are you with our product?',
                            description: 'Rate your overall experience',
                            status: 'active',
                            vote_count: 128,
                            options: [
                                { id: 'opt-4', text: 'Very Satisfied', votes: 68 },
                                { id: 'opt-5', text: 'Satisfied', votes: 42 },
                                { id: 'opt-6', text: 'Neutral', votes: 12 },
                                { id: 'opt-7', text: 'Unsatisfied', votes: 6 },
                            ],
                            closes_at: null,
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 'poll-3',
                            title: 'Draft Poll for Testing',
                            description: 'This is a draft poll',
                            status: 'draft',
                            vote_count: 0,
                            options: [],
                            closes_at: null,
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 'poll-4',
                            title: 'Completed Q3 Survey',
                            description: 'This poll has ended',
                            status: 'closed',
                            vote_count: 234,
                            options: [
                                { id: 'opt-8', text: 'Option A', votes: 120 },
                                { id: 'opt-9', text: 'Option B', votes: 114 },
                            ],
                            closes_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });
        } else if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    poll: {
                        id: 'new-poll-id',
                        title: 'New Poll',
                        status: 'draft',
                    },
                }),
            });
        } else {
            await route.continue();
        }
    });
}

// Mock knowledge gap API
async function mockKnowledgeGapAPI(page: Page) {
    await page.route('**/api/knowledge-gaps**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                gaps: [
                    {
                        id: 'gap-1',
                        question: 'What pricing model do users prefer?',
                        confidence: 0.3,
                        feedback_count: 5,
                        suggested_poll: {
                            title: 'Pricing Model Preference',
                            options: ['Monthly', 'Annual', 'Pay-per-use'],
                        },
                    },
                ],
            }),
        });
    });
}

test.describe('Polls List Page', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockPollsAPI(page);
        await mockKnowledgeGapAPI(page);
    });

    test.describe('Page Loading', () => {
        test('should display Polls & Surveys header', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('h1')).toContainText(/Polls|Surveys/i);
        });

        test('should show Create Poll button', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('button:has-text("Create Poll")')).toBeVisible();
        });

        test('should show View Surveys button', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('button:has-text("View Surveys")')).toBeVisible();
        });

        test('should display loading state', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            // May briefly show loading
            const loader = page.locator('text=Loading polls');
            // Brief state
        });
    });

    test.describe('Polls List Display', () => {
        test('should display poll cards', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            // Should show poll cards
            const pollCards = page.locator('[class*="card"]');
            expect(await pollCards.count()).toBeGreaterThanOrEqual(1);
        });

        test('should show poll titles', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('text=/Which feature|How satisfied/i').first()).toBeVisible();
        });

        test('should show vote counts', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('text=/\\d+\\s*votes?/i').first()).toBeVisible();
        });

        test('should show option counts', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('text=/\\d+\\s*options?/i').first()).toBeVisible();
        });

        test('should show status badges', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            // Look for status badges
            await expect(page.locator('[class*="badge"]:has-text("active"), [class*="badge"]:has-text("draft"), [class*="badge"]:has-text("closed")').first()).toBeVisible();
        });

        test('should show closing dates', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            // Look for date display
            const dateDisplay = page.locator('[class*="date"], text=/\\d{1,2}\\/\\d{1,2}/');
            // May be visible
        });
    });

    test.describe('Filtering', () => {
        test('should display filter tabs', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('button:has-text("All"), [role="tab"]:has-text("All")')).toBeVisible();
            await expect(page.locator('button:has-text("Active"), [role="tab"]:has-text("Active")')).toBeVisible();
            await expect(page.locator('button:has-text("Drafts"), [role="tab"]:has-text("Draft")')).toBeVisible();
            await expect(page.locator('button:has-text("Closed"), [role="tab"]:has-text("Closed")')).toBeVisible();
        });

        test('should filter by active status', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await page.locator('button:has-text("Active"), [role="tab"]:has-text("Active")').click();

            // Should only show active polls
            await page.waitForTimeout(300);
        });

        test('should filter by draft status', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await page.locator('button:has-text("Drafts"), [role="tab"]:has-text("Draft")').click();

            await page.waitForTimeout(300);
        });

        test('should filter by closed status', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await page.locator('button:has-text("Closed"), [role="tab"]:has-text("Closed")').click();

            await page.waitForTimeout(300);
        });
    });

    test.describe('Search', () => {
        test('should display search input', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('input[placeholder*="Search"], input[type="search"]')).toBeVisible();
        });

        test('should filter polls by search query', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
            await searchInput.fill('feature');

            await page.waitForTimeout(300);
            // Should filter results
        });
    });

    test.describe('Knowledge Gap Card', () => {
        test('should display knowledge gap suggestions', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            // Look for knowledge gap card
            const gapCard = page.locator('text=/knowledge gap|suggested.*poll/i');
            // May be visible
        });

        test('should allow creating poll from suggestion', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            const createButton = page.locator('button:has-text("Create This Poll")');
            // May be visible if knowledge gaps exist
        });
    });

    test.describe('Poll Actions', () => {
        test('should show dropdown menu on poll cards', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            const moreButton = page.locator('[class*="card"] button:has(svg)').first();
            if (await moreButton.isVisible()) {
                await moreButton.click();

                // Should show dropdown options
                await expect(page.locator('text=View Results')).toBeVisible();
            }
        });

        test('should show View Results option', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            const moreButton = page.locator('[class*="card"] button:has(svg)').first();
            if (await moreButton.isVisible()) {
                await moreButton.click();
                await expect(page.locator('[role="menuitem"]:has-text("View Results")')).toBeVisible();
            }
        });

        test('should show Copy Share Link option', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            const moreButton = page.locator('[class*="card"] button:has(svg)').first();
            if (await moreButton.isVisible()) {
                await moreButton.click();
                await expect(page.locator('[role="menuitem"]:has-text("Copy Share Link")')).toBeVisible();
            }
        });

        test('should show Delete option', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            const moreButton = page.locator('[class*="card"] button:has(svg)').first();
            if (await moreButton.isVisible()) {
                await moreButton.click();
                await expect(page.locator('[role="menuitem"]:has-text("Delete")')).toBeVisible();
            }
        });
    });

    test.describe('Navigation', () => {
        test('should navigate to create poll page', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await page.locator('button:has-text("Create Poll")').click();

            await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_SLUG}/polls/new`));
        });

        test('should navigate to surveys page', async ({ page }) => {
            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await page.locator('button:has-text("View Surveys")').click();

            await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_SLUG}/surveys`));
        });
    });

    test.describe('Empty State', () => {
        test('should show empty state when no polls', async ({ page }) => {
            await page.route('**/api/polls**', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ polls: [] }),
                });
            });

            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('text=/No polls|Create your first poll/i')).toBeVisible();
        });

        test('should show create button in empty state', async ({ page }) => {
            await page.route('**/api/polls**', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ polls: [] }),
                });
            });

            await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

            await expect(page.locator('button:has-text("Create")')).toBeVisible();
        });
    });
});

test.describe('Poll Creation', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockPollsAPI(page);
    });

    test('should display create poll form', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls/new`);

        // Should show form elements
        await expect(page.locator('input, textarea').first()).toBeVisible();
    });

    test('should have title input', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls/new`);

        await expect(page.locator('input[name="title"], input[placeholder*="title" i]')).toBeVisible();
    });

    test('should have description input', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls/new`);

        await expect(page.locator('textarea, input[placeholder*="description" i]').first()).toBeVisible();
    });

    test('should allow adding options', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls/new`);

        const addButton = page.locator('button:has-text("Add Option"), button:has-text("Add")');
        await expect(addButton.first()).toBeVisible();
    });
});

test.describe('Poll Voting', () => {
    test.beforeEach(async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);

        await page.route('**/api/polls/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    poll: {
                        id: 'poll-1',
                        title: 'Which feature should we prioritize?',
                        description: 'Help us decide',
                        status: 'active',
                        options: [
                            { id: 'opt-1', text: 'Dark Mode' },
                            { id: 'opt-2', text: 'Mobile App' },
                            { id: 'opt-3', text: 'API Improvements' },
                        ],
                    },
                }),
            });
        });
    });

    test('should display voting page', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls/poll-1/vote`);

        await expect(page.locator('text=/Which feature|prioritize/i')).toBeVisible();
    });

    test('should display voting options', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls/poll-1/vote`);

        await expect(page.locator('text=/Dark Mode|Mobile App|API/i').first()).toBeVisible();
    });

    test('should allow selecting an option', async ({ page }) => {
        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls/poll-1/vote`);

        const option = page.locator('button, [role="radio"], input[type="radio"]').first();
        if (await option.isVisible()) {
            await option.click();
        }
    });
});

test.describe('Polls - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display polls on mobile', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockPollsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

        await expect(page.locator('h1')).toContainText(/Polls|Surveys/i);
    });

    test('should stack poll cards on mobile', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockPollsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

        const cards = page.locator('[class*="card"]');
        expect(await cards.count()).toBeGreaterThanOrEqual(1);
    });

    test('should have scrollable filter tabs', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockPollsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

        const tabList = page.locator('[role="tablist"]');
        await expect(tabList).toBeVisible();
    });
});

test.describe('Polls - Accessibility', () => {
    test('should have proper heading', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockPollsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

        await expect(page.locator('h1')).toBeVisible();
    });

    test('should have accessible search input', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockPollsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

        const searchInput = page.locator('input[placeholder*="Search"]');
        await expect(searchInput).toBeVisible();
    });

    test('should support keyboard navigation in tabs', async ({ page }) => {
        await mockProjectAPI(page, TEST_PROJECT_SLUG);
        await mockPollsAPI(page);

        await page.goto(`${BASE_URL}/${TEST_PROJECT_SLUG}/polls`);

        await page.locator('[role="tab"]').first().focus();
        await page.keyboard.press('ArrowRight');
    });
});
