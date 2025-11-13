-- ============================================================================
-- SIMPLE MOCK DATA FOR THEME DETECTION
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Find your project_id and board_id:
--    SELECT id, slug FROM projects;
--    SELECT id, name FROM boards WHERE project_id = 'YOUR_PROJECT_ID';
--
-- 2. Replace the UUIDs in the DECLARE section below (lines 16-17)
-- 3. Run this entire file in Supabase SQL Editor
-- ============================================================================

DO $$
DECLARE
  v_project_id UUID := 'abdb958b-5c3c-42dd-8b6d-b41a668baad3';  -- ⚠️ REPLACE THIS
  v_board_id UUID := 'b96c054e-3bd7-4afe-88ff-f2ba14d789cc';    -- ⚠️ REPLACE THIS
BEGIN

-- ============================================================================
-- FEEDBACK POSTS (44 total)
-- ============================================================================

-- Mobile App Bugs (negative sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'App crashes on Android when uploading images', 'Every time I try to upload an image from my gallery, the app crashes. Using Samsung Galaxy S22.', 'open', 'Bug', NOW() - INTERVAL '2 days', 12),
(v_project_id, v_board_id, 'iOS app freezes on dashboard', 'The app becomes unresponsive when I navigate to the dashboard. Have to force quit.', 'open', 'Bug', NOW() - INTERVAL '5 days', 8),
(v_project_id, v_board_id, 'Mobile notifications not working', 'Not receiving push notifications on my iPhone. Checked settings and they are enabled.', 'open', 'Bug', NOW() - INTERVAL '1 day', 15),
(v_project_id, v_board_id, 'Login fails on mobile after update', 'Cannot log in after the latest app update. Keeps saying invalid credentials but they work on web.', 'planned', 'Bug', NOW() - INTERVAL '3 days', 10),
(v_project_id, v_board_id, 'Camera permission issue on Android', 'App asks for camera permission but crashes when I grant it.', 'open', 'Bug', NOW() - INTERVAL '4 days', 6),
(v_project_id, v_board_id, 'Offline mode not syncing properly', 'Changes made offline don''t sync when I come back online on mobile.', 'open', 'Bug', NOW() - INTERVAL '6 days', 9),
(v_project_id, v_board_id, 'Mobile app battery drain', 'The mobile app drains my battery really fast even when running in background.', 'open', 'Performance', NOW() - INTERVAL '7 days', 11);

-- Dark Mode Requests (EMERGING - positive sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'Add dark mode please!', 'Would love to have a dark mode option. The bright white is hard on my eyes at night.', 'open', 'Feature Request', NOW() - INTERVAL '1 day', 23),
(v_project_id, v_board_id, 'Dark theme for desktop app', 'Please add dark mode support. All my other apps have it and this one stands out.', 'open', 'Feature Request', NOW() - INTERVAL '2 days', 18),
(v_project_id, v_board_id, 'Night mode / Dark UI', 'Can we get a dark mode? Working late nights and the bright interface is painful.', 'planned', 'UI/UX', NOW() - INTERVAL '1 day', 20),
(v_project_id, v_board_id, 'Theme customization options', 'Would be great to have theme options including dark mode and custom colors.', 'open', 'Feature Request', NOW() - INTERVAL '3 days', 14),
(v_project_id, v_board_id, 'Auto dark mode based on time', 'Add dark mode that automatically switches based on time of day or system preference.', 'open', 'Feature Request', NOW() - INTERVAL '1 day', 16);

-- Performance Issues (negative sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'Dashboard loads very slowly', 'The main dashboard takes 10+ seconds to load. This is with a fast internet connection.', 'open', 'Performance', NOW() - INTERVAL '4 days', 17),
(v_project_id, v_board_id, 'Search is extremely slow with large datasets', 'When searching through our feedback (we have 500+ items), it takes forever to return results.', 'in_progress', 'Performance', NOW() - INTERVAL '8 days', 13),
(v_project_id, v_board_id, 'Pagination lag on feedback list', 'Scrolling through feedback list is very laggy. Seems to load everything at once.', 'open', 'Performance', NOW() - INTERVAL '5 days', 9),
(v_project_id, v_board_id, 'Slow image loading in posts', 'Images in feedback posts take a long time to load. Need better optimization.', 'open', 'Performance', NOW() - INTERVAL '6 days', 7),
(v_project_id, v_board_id, 'Export takes too long', 'Exporting feedback to CSV takes several minutes. Should be faster.', 'open', 'Performance', NOW() - INTERVAL '9 days', 8),
(v_project_id, v_board_id, 'Analytics page timeout', 'The analytics page times out when we have a lot of data. Need better performance.', 'open', 'Performance', NOW() - INTERVAL '7 days', 12);

-- API Integration Requests (positive sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'Zapier integration', 'Would love to integrate with Zapier to automate workflows with other tools.', 'open', 'Integration', NOW() - INTERVAL '10 days', 22),
(v_project_id, v_board_id, 'Slack notifications for new feedback', 'Send notifications to Slack when new feedback is submitted.', 'done', 'Integration', NOW() - INTERVAL '15 days', 19),
(v_project_id, v_board_id, 'Jira integration for feedback', 'Ability to create Jira tickets directly from feedback items.', 'planned', 'Integration', NOW() - INTERVAL '12 days', 25),
(v_project_id, v_board_id, 'Webhook support', 'Need webhook support to integrate with our internal systems.', 'open', 'Integration', NOW() - INTERVAL '11 days', 14);

-- Export Features (neutral sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'Export to Excel with formatting', 'Current CSV export loses formatting. Need proper Excel export with charts.', 'open', 'Feature Request', NOW() - INTERVAL '8 days', 11),
(v_project_id, v_board_id, 'PDF export for reports', 'Would like to export feedback summaries as PDFs for stakeholder reports.', 'open', 'Feature Request', NOW() - INTERVAL '9 days', 9),
(v_project_id, v_board_id, 'Bulk export with filters', 'Need to export filtered subsets of feedback, not just everything.', 'open', 'Feature Request', NOW() - INTERVAL '7 days', 13);

-- UI Improvements (mixed positive)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'Better mobile responsive design', 'Some pages don''t look good on mobile. Need better responsive design.', 'open', 'UI/UX', NOW() - INTERVAL '6 days', 10),
(v_project_id, v_board_id, 'Improve voting button visibility', 'The voting buttons are hard to see. Make them more prominent.', 'done', 'UI/UX', NOW() - INTERVAL '20 days', 8),
(v_project_id, v_board_id, 'Add keyboard shortcuts', 'Would be nice to have keyboard shortcuts for common actions.', 'open', 'UI/UX', NOW() - INTERVAL '5 days', 12),
(v_project_id, v_board_id, 'Customizable dashboard layout', 'Let users customize which widgets appear on their dashboard.', 'open', 'UI/UX', NOW() - INTERVAL '13 days', 15),
(v_project_id, v_board_id, 'Better empty states', 'When there''s no data, show helpful empty states with actions.', 'in_progress', 'UI/UX', NOW() - INTERVAL '8 days', 6);

-- Search Functionality (neutral sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'Advanced search with filters', 'Need advanced search that can filter by date, category, votes, etc.', 'open', 'Feature Request', NOW() - INTERVAL '11 days', 18),
(v_project_id, v_board_id, 'Search by tags', 'Ability to add tags to feedback and search by them.', 'open', 'Feature Request', NOW() - INTERVAL '9 days', 12),
(v_project_id, v_board_id, 'Fuzzy search support', 'Current search is too exact. Need fuzzy matching for typos.', 'open', 'Improvement', NOW() - INTERVAL '10 days', 9),
(v_project_id, v_board_id, 'Save search queries', 'Let users save frequently used search queries for quick access.', 'open', 'Feature Request', NOW() - INTERVAL '12 days', 7);

-- Notification Improvements (positive sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'Email digest of weekly activity', 'Send a weekly email summarizing new feedback and updates.', 'open', 'Feature Request', NOW() - INTERVAL '14 days', 16),
(v_project_id, v_board_id, 'Notification preferences', 'More granular control over which notifications I receive.', 'open', 'Feature Request', NOW() - INTERVAL '13 days', 11),
(v_project_id, v_board_id, 'In-app notification center', 'A central place in the app to see all notifications.', 'planned', 'Feature Request', NOW() - INTERVAL '15 days', 14);

-- Pricing Concerns (negative sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'Pricing is too high for small teams', 'Love the product but $99/mo is steep for our 3-person startup.', 'open', 'Other', NOW() - INTERVAL '16 days', 21),
(v_project_id, v_board_id, 'Need a better free tier', 'Free tier is too limited. At least allow more feedback items.', 'open', 'Other', NOW() - INTERVAL '17 days', 19),
(v_project_id, v_board_id, 'Annual pricing discount?', 'Would you offer a discount for annual subscriptions?', 'open', 'Other', NOW() - INTERVAL '18 days', 13),
(v_project_id, v_board_id, 'Student/Nonprofit pricing', 'Any plans for discounted pricing for students or nonprofits?', 'open', 'Other', NOW() - INTERVAL '19 days', 15);

-- Onboarding Improvements (neutral sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count) VALUES
(v_project_id, v_board_id, 'Better onboarding tutorial', 'First time users need a better guided tour of features.', 'open', 'Documentation', NOW() - INTERVAL '20 days', 10),
(v_project_id, v_board_id, 'Video tutorials', 'Would love to see video tutorials for key features.', 'open', 'Documentation', NOW() - INTERVAL '21 days', 8),
(v_project_id, v_board_id, 'Sample project template', 'Provide a sample project with example feedback for new users.', 'done', 'Documentation', NOW() - INTERVAL '25 days', 12);

RAISE NOTICE 'Successfully inserted 44 mock feedback posts!';
RAISE NOTICE 'Navigate to /{your-project-slug}/ai-insights and click "Re-analyze Themes" to detect themes!';

END $$;
