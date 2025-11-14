-- ============================================================================
-- MOCK DATA FOR THEME DETECTION FEATURE
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- IMPORTANT: Replace 'YOUR_PROJECT_ID_HERE' with your actual project ID
-- You can find it by running: SELECT id, slug FROM projects LIMIT 5;

-- Set your project ID here
DO $$
DECLARE
  v_project_id UUID := 'YOUR_PROJECT_ID_HERE'; -- REPLACE THIS!
  v_board_id UUID := 'YOUR_BOARD_ID_HERE'; -- REPLACE THIS!

  -- Theme IDs (will be generated)
  v_theme_mobile_bugs UUID;
  v_theme_dark_mode UUID;
  v_theme_performance UUID;
  v_theme_api_integration UUID;
  v_theme_export_features UUID;
  v_theme_ui_improvements UUID;
  v_theme_search_functionality UUID;
  v_theme_notifications UUID;
  v_theme_pricing_concerns UUID;
  v_theme_onboarding UUID;

  -- Post IDs
  v_post_ids UUID[];
  v_post_id UUID;
  v_counter INT := 0;

BEGIN

-- ============================================================================
-- 1. CREATE MOCK FEEDBACK POSTS
-- ============================================================================

-- Mobile App Bugs (7 posts)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'App crashes on Android when uploading images', 'Every time I try to upload an image from my gallery, the app crashes. Using Samsung Galaxy S22.', 'open', 'Bug', NOW() - INTERVAL '2 days', 12),
  (v_project_id, v_board_id, 'iOS app freezes on dashboard', 'The app becomes unresponsive when I navigate to the dashboard. Have to force quit.', 'open', 'Bug', NOW() - INTERVAL '5 days', 8),
  (v_project_id, v_board_id, 'Mobile notifications not working', 'Not receiving push notifications on my iPhone. Checked settings and they are enabled.', 'open', 'Bug', NOW() - INTERVAL '1 day', 15),
  (v_project_id, v_board_id, 'Login fails on mobile after update', 'Cannot log in after the latest app update. Keeps saying invalid credentials but they work on web.', 'planned', 'Bug', NOW() - INTERVAL '3 days', 10),
  (v_project_id, v_board_id, 'Camera permission issue on Android', 'App asks for camera permission but crashes when I grant it.', 'open', 'Bug', NOW() - INTERVAL '4 days', 6),
  (v_project_id, v_board_id, 'Offline mode not syncing properly', 'Changes made offline don''t sync when I come back online on mobile.', 'open', 'Bug', NOW() - INTERVAL '6 days', 9),
  (v_project_id, v_board_id, 'Mobile app battery drain', 'The mobile app drains my battery really fast even when running in background.', 'open', 'Performance', NOW() - INTERVAL '7 days', 11)
RETURNING id INTO v_post_id;

-- Dark Mode Requests (5 posts - EMERGING THEME)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'Add dark mode please!', 'Would love to have a dark mode option. The bright white is hard on my eyes at night.', 'open', 'Feature Request', NOW() - INTERVAL '1 day', 23),
  (v_project_id, v_board_id, 'Dark theme for desktop app', 'Please add dark mode support. All my other apps have it and this one stands out.', 'open', 'Feature Request', NOW() - INTERVAL '2 days', 18),
  (v_project_id, v_board_id, 'Night mode / Dark UI', 'Can we get a dark mode? Working late nights and the bright interface is painful.', 'planned', 'UI/UX', NOW() - INTERVAL '1 day', 20),
  (v_project_id, v_board_id, 'Theme customization options', 'Would be great to have theme options including dark mode and custom colors.', 'open', 'Feature Request', NOW() - INTERVAL '3 days', 14),
  (v_project_id, v_board_id, 'Auto dark mode based on time', 'Add dark mode that automatically switches based on time of day or system preference.', 'open', 'Feature Request', NOW() - INTERVAL '1 day', 16);

-- Performance Issues (6 posts)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'Dashboard loads very slowly', 'The main dashboard takes 10+ seconds to load. This is with a fast internet connection.', 'open', 'Performance', NOW() - INTERVAL '4 days', 17),
  (v_project_id, v_board_id, 'Search is extremely slow with large datasets', 'When searching through our feedback (we have 500+ items), it takes forever to return results.', 'in_progress', 'Performance', NOW() - INTERVAL '8 days', 13),
  (v_project_id, v_board_id, 'Pagination lag on feedback list', 'Scrolling through feedback list is very laggy. Seems to load everything at once.', 'open', 'Performance', NOW() - INTERVAL '5 days', 9),
  (v_project_id, v_board_id, 'Slow image loading in posts', 'Images in feedback posts take a long time to load. Need better optimization.', 'open', 'Performance', NOW() - INTERVAL '6 days', 7),
  (v_project_id, v_board_id, 'Export takes too long', 'Exporting feedback to CSV takes several minutes. Should be faster.', 'open', 'Performance', NOW() - INTERVAL '9 days', 8),
  (v_project_id, v_board_id, 'Analytics page timeout', 'The analytics page times out when we have a lot of data. Need better performance.', 'open', 'Performance', NOW() - INTERVAL '7 days', 12);

-- API Integration Requests (4 posts)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'Zapier integration', 'Would love to integrate with Zapier to automate workflows with other tools.', 'open', 'Integration', NOW() - INTERVAL '10 days', 22),
  (v_project_id, v_board_id, 'Slack notifications for new feedback', 'Send notifications to Slack when new feedback is submitted.', 'done', 'Integration', NOW() - INTERVAL '15 days', 19),
  (v_project_id, v_board_id, 'Jira integration for feedback', 'Ability to create Jira tickets directly from feedback items.', 'planned', 'Integration', NOW() - INTERVAL '12 days', 25),
  (v_project_id, v_board_id, 'Webhook support', 'Need webhook support to integrate with our internal systems.', 'open', 'Integration', NOW() - INTERVAL '11 days', 14);

-- Export Features (3 posts)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'Export to Excel with formatting', 'Current CSV export loses formatting. Need proper Excel export with charts.', 'open', 'Feature Request', NOW() - INTERVAL '8 days', 11),
  (v_project_id, v_board_id, 'PDF export for reports', 'Would like to export feedback summaries as PDFs for stakeholder reports.', 'open', 'Feature Request', NOW() - INTERVAL '9 days', 9),
  (v_project_id, v_board_id, 'Bulk export with filters', 'Need to export filtered subsets of feedback, not just everything.', 'open', 'Feature Request', NOW() - INTERVAL '7 days', 13);

-- UI Improvements (5 posts)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'Better mobile responsive design', 'Some pages don''t look good on mobile. Need better responsive design.', 'open', 'UI/UX', NOW() - INTERVAL '6 days', 10),
  (v_project_id, v_board_id, 'Improve voting button visibility', 'The voting buttons are hard to see. Make them more prominent.', 'done', 'UI/UX', NOW() - INTERVAL '20 days', 8),
  (v_project_id, v_board_id, 'Add keyboard shortcuts', 'Would be nice to have keyboard shortcuts for common actions.', 'open', 'UI/UX', NOW() - INTERVAL '5 days', 12),
  (v_project_id, v_board_id, 'Customizable dashboard layout', 'Let users customize which widgets appear on their dashboard.', 'open', 'UI/UX', NOW() - INTERVAL '13 days', 15),
  (v_project_id, v_board_id, 'Better empty states', 'When there''s no data, show helpful empty states with actions.', 'in_progress', 'UI/UX', NOW() - INTERVAL '8 days', 6);

-- Search Functionality (4 posts)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'Advanced search with filters', 'Need advanced search that can filter by date, category, votes, etc.', 'open', 'Feature Request', NOW() - INTERVAL '11 days', 18),
  (v_project_id, v_board_id, 'Search by tags', 'Ability to add tags to feedback and search by them.', 'open', 'Feature Request', NOW() - INTERVAL '9 days', 12),
  (v_project_id, v_board_id, 'Fuzzy search support', 'Current search is too exact. Need fuzzy matching for typos.', 'open', 'Improvement', NOW() - INTERVAL '10 days', 9),
  (v_project_id, v_board_id, 'Save search queries', 'Let users save frequently used search queries for quick access.', 'open', 'Feature Request', NOW() - INTERVAL '12 days', 7);

-- Notification Improvements (3 posts)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'Email digest of weekly activity', 'Send a weekly email summarizing new feedback and updates.', 'open', 'Feature Request', NOW() - INTERVAL '14 days', 16),
  (v_project_id, v_board_id, 'Notification preferences', 'More granular control over which notifications I receive.', 'open', 'Feature Request', NOW() - INTERVAL '13 days', 11),
  (v_project_id, v_board_id, 'In-app notification center', 'A central place in the app to see all notifications.', 'planned', 'Feature Request', NOW() - INTERVAL '15 days', 14);

-- Pricing Concerns (4 posts - some negative sentiment)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'Pricing is too high for small teams', 'Love the product but $99/mo is steep for our 3-person startup.', 'open', 'Other', NOW() - INTERVAL '16 days', 21),
  (v_project_id, v_board_id, 'Need a better free tier', 'Free tier is too limited. At least allow more feedback items.', 'open', 'Other', NOW() - INTERVAL '17 days', 19),
  (v_project_id, v_board_id, 'Annual pricing discount?', 'Would you offer a discount for annual subscriptions?', 'open', 'Other', NOW() - INTERVAL '18 days', 13),
  (v_project_id, v_board_id, 'Student/Nonprofit pricing', 'Any plans for discounted pricing for students or nonprofits?', 'open', 'Other', NOW() - INTERVAL '19 days', 15);

-- Onboarding Improvements (3 posts)
INSERT INTO posts (project_id, board_id, title, description, status, category, created_at, vote_count)
VALUES
  (v_project_id, v_board_id, 'Better onboarding tutorial', 'First time users need a better guided tour of features.', 'open', 'Documentation', NOW() - INTERVAL '20 days', 10),
  (v_project_id, v_board_id, 'Video tutorials', 'Would love to see video tutorials for key features.', 'open', 'Documentation', NOW() - INTERVAL '21 days', 8),
  (v_project_id, v_board_id, 'Sample project template', 'Provide a sample project with example feedback for new users.', 'done', 'Documentation', NOW() - INTERVAL '25 days', 12);

-- ============================================================================
-- 2. CREATE THEMES
-- ============================================================================

-- Insert themes with realistic metrics
INSERT INTO themes (project_id, theme_name, description, frequency, avg_sentiment, first_seen, last_seen, is_emerging, created_at)
VALUES
  (v_project_id, 'Mobile App Bugs', 'Users reporting crashes, freezes, and technical issues on mobile platforms', 7, -0.65, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day', false, NOW() - INTERVAL '7 days'),
  (v_project_id, 'Dark Mode Request', 'Multiple requests for dark theme and night mode support', 5, 0.45, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', true, NOW() - INTERVAL '3 days'),
  (v_project_id, 'Performance Issues', 'Reports of slow loading, lag, and timeout problems', 6, -0.58, NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 days', false, NOW() - INTERVAL '9 days'),
  (v_project_id, 'API Integrations', 'Requests for third-party integrations and API access', 4, 0.38, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', false, NOW() - INTERVAL '15 days'),
  (v_project_id, 'Export Capabilities', 'Users wanting better data export options and formats', 3, 0.12, NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days', false, NOW() - INTERVAL '9 days'),
  (v_project_id, 'UI/UX Improvements', 'Requests for better user interface and experience', 5, 0.25, NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', false, NOW() - INTERVAL '20 days'),
  (v_project_id, 'Search Functionality', 'Feedback about search features and capabilities', 4, 0.18, NOW() - INTERVAL '12 days', NOW() - INTERVAL '9 days', false, NOW() - INTERVAL '12 days'),
  (v_project_id, 'Notification System', 'Requests for better notification options and preferences', 3, 0.32, NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days', false, NOW() - INTERVAL '15 days'),
  (v_project_id, 'Pricing Concerns', 'Feedback about pricing, plans, and costs', 4, -0.42, NOW() - INTERVAL '19 days', NOW() - INTERVAL '16 days', false, NOW() - INTERVAL '19 days'),
  (v_project_id, 'Onboarding & Documentation', 'Requests for better tutorials and learning resources', 3, 0.08, NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days', false, NOW() - INTERVAL '25 days')
RETURNING id INTO v_theme_mobile_bugs;

-- Get theme IDs for mapping
SELECT id INTO v_theme_mobile_bugs FROM themes WHERE project_id = v_project_id AND theme_name = 'Mobile App Bugs';
SELECT id INTO v_theme_dark_mode FROM themes WHERE project_id = v_project_id AND theme_name = 'Dark Mode Request';
SELECT id INTO v_theme_performance FROM themes WHERE project_id = v_project_id AND theme_name = 'Performance Issues';
SELECT id INTO v_theme_api_integration FROM themes WHERE project_id = v_project_id AND theme_name = 'API Integrations';
SELECT id INTO v_theme_export_features FROM themes WHERE project_id = v_project_id AND theme_name = 'Export Capabilities';
SELECT id INTO v_theme_ui_improvements FROM themes WHERE project_id = v_project_id AND theme_name = 'UI/UX Improvements';
SELECT id INTO v_theme_search_functionality FROM themes WHERE project_id = v_project_id AND theme_name = 'Search Functionality';
SELECT id INTO v_theme_notifications FROM themes WHERE project_id = v_project_id AND theme_name = 'Notification System';
SELECT id INTO v_theme_pricing_concerns FROM themes WHERE project_id = v_project_id AND theme_name = 'Pricing Concerns';
SELECT id INTO v_theme_onboarding FROM themes WHERE project_id = v_project_id AND theme_name = 'Onboarding & Documentation';

-- ============================================================================
-- 3. CREATE FEEDBACK-THEME MAPPINGS
-- ============================================================================

-- Get all post IDs for the project
SELECT array_agg(id ORDER BY created_at DESC) INTO v_post_ids
FROM posts
WHERE project_id = v_project_id
AND created_at >= NOW() - INTERVAL '30 days';

-- Map Mobile App Bugs theme (posts 1-7)
FOR v_counter IN 1..7 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_mobile_bugs, 0.85 + (random() * 0.1));
END LOOP;

-- Map Dark Mode theme (posts 8-12)
FOR v_counter IN 8..12 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_dark_mode, 0.88 + (random() * 0.1));
END LOOP;

-- Map Performance Issues theme (posts 13-18)
FOR v_counter IN 13..18 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_performance, 0.82 + (random() * 0.12));
END LOOP;

-- Map API Integrations theme (posts 19-22)
FOR v_counter IN 19..22 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_api_integration, 0.86 + (random() * 0.1));
END LOOP;

-- Map Export Features theme (posts 23-25)
FOR v_counter IN 23..25 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_export_features, 0.84 + (random() * 0.1));
END LOOP;

-- Map UI Improvements theme (posts 26-30)
FOR v_counter IN 26..30 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_ui_improvements, 0.80 + (random() * 0.12));
END LOOP;

-- Map Search Functionality theme (posts 31-34)
FOR v_counter IN 31..34 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_search_functionality, 0.87 + (random() * 0.1));
END LOOP;

-- Map Notifications theme (posts 35-37)
FOR v_counter IN 35..37 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_notifications, 0.85 + (random() * 0.1));
END LOOP;

-- Map Pricing Concerns theme (posts 38-41)
FOR v_counter IN 38..41 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_pricing_concerns, 0.83 + (random() * 0.12));
END LOOP;

-- Map Onboarding theme (posts 42-44)
FOR v_counter IN 42..44 LOOP
  INSERT INTO feedback_themes (feedback_id, theme_id, confidence)
  VALUES (v_post_ids[v_counter], v_theme_onboarding, 0.81 + (random() * 0.12));
END LOOP;

-- ============================================================================
-- 4. ADD SENTIMENT ANALYSIS DATA
-- ============================================================================

-- Mobile bugs - negative sentiment
FOR v_counter IN 1..7 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    'negative',
    -0.6 - (random() * 0.3),
    CASE (random() * 3)::int
      WHEN 0 THEN 'frustrated'
      WHEN 1 THEN 'angry'
      ELSE 'disappointed'
    END,
    0.82 + (random() * 0.15)
  );
END LOOP;

-- Dark mode - positive sentiment
FOR v_counter IN 8..12 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    'positive',
    0.4 + (random() * 0.3),
    CASE (random() * 2)::int
      WHEN 0 THEN 'hopeful'
      ELSE 'excited'
    END,
    0.85 + (random() * 0.12)
  );
END LOOP;

-- Performance - negative sentiment
FOR v_counter IN 13..18 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    'negative',
    -0.5 - (random() * 0.3),
    'frustrated',
    0.80 + (random() * 0.15)
  );
END LOOP;

-- API Integrations - positive sentiment
FOR v_counter IN 19..22 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    'positive',
    0.3 + (random() * 0.25),
    'hopeful',
    0.83 + (random() * 0.12)
  );
END LOOP;

-- Export - neutral sentiment
FOR v_counter IN 23..25 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    'neutral',
    0.0 + (random() * 0.2),
    'neutral',
    0.78 + (random() * 0.15)
  );
END LOOP;

-- UI Improvements - mixed positive
FOR v_counter IN 26..30 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    CASE (random() * 2)::int
      WHEN 0 THEN 'positive'
      ELSE 'neutral'
    END,
    0.1 + (random() * 0.3),
    CASE (random() * 2)::int
      WHEN 0 THEN 'hopeful'
      ELSE 'satisfied'
    END,
    0.79 + (random() * 0.15)
  );
END LOOP;

-- Search - neutral to positive
FOR v_counter IN 31..34 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    'neutral',
    0.1 + (random() * 0.2),
    'neutral',
    0.81 + (random() * 0.12)
  );
END LOOP;

-- Notifications - positive
FOR v_counter IN 35..37 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    'positive',
    0.25 + (random() * 0.25),
    'hopeful',
    0.84 + (random() * 0.12)
  );
END LOOP;

-- Pricing - negative
FOR v_counter IN 38..41 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    'negative',
    -0.3 - (random() * 0.3),
    'concerned',
    0.80 + (random() * 0.15)
  );
END LOOP;

-- Onboarding - neutral
FOR v_counter IN 42..44 LOOP
  INSERT INTO sentiment_analysis (post_id, sentiment_category, sentiment_score, emotional_tone, confidence_score)
  VALUES (
    v_post_ids[v_counter],
    'neutral',
    0.0 + (random() * 0.15),
    'neutral',
    0.77 + (random() * 0.15)
  );
END LOOP;

RAISE NOTICE '✅ Mock data created successfully!';
RAISE NOTICE '📊 Created 44 feedback posts';
RAISE NOTICE '🎯 Created 10 themes';
RAISE NOTICE '🔗 Created feedback-theme mappings';
RAISE NOTICE '💭 Created sentiment analysis data';
RAISE NOTICE '';
RAISE NOTICE '🚀 Navigate to /{your-project-slug}/ai-insights to see the themes!';

END $$;
