# Mock Data for Theme Detection Feature

This directory contains mock data to help you test and visualize the Theme & Pattern Detection Engine.

## 📊 What's Included

The mock data creates:
- **44 feedback posts** across 10 different themes
- **Realistic sentiment scores** (positive, negative, neutral)
- **Various categories** (Bug, Feature Request, Performance, etc.)
- **Vote counts** and engagement metrics
- **Time-based distribution** (last 25 days)

## 🎯 Themes Included

1. **Mobile App Bugs** (7 posts) - Negative sentiment
2. **Dark Mode Request** (5 posts) - EMERGING theme, positive sentiment
3. **Performance Issues** (6 posts) - Negative sentiment
4. **API Integrations** (4 posts) - Positive sentiment
5. **Export Capabilities** (3 posts) - Neutral sentiment
6. **UI/UX Improvements** (5 posts) - Mixed positive
7. **Search Functionality** (4 posts) - Neutral sentiment
8. **Notification System** (3 posts) - Positive sentiment
9. **Pricing Concerns** (4 posts) - Negative sentiment
10. **Onboarding & Documentation** (3 posts) - Neutral sentiment

## 🚀 Quick Start (Recommended)

### Step 1: Find Your IDs

Run this in Supabase SQL Editor:

```sql
-- Get your project ID
SELECT id, slug, name FROM projects;

-- Get your board ID (use the project ID from above)
SELECT id, name FROM boards WHERE project_id = 'YOUR_PROJECT_ID';
```

### Step 2: Use Simple Mock Data

1. Open `mock-data-simple.sql`
2. Replace `YOUR_PROJECT_ID` and `YOUR_BOARD_ID` with your actual IDs
3. Run the entire file in Supabase SQL Editor
4. Navigate to `/{your-project-slug}/ai-insights`
5. Click **"Re-analyze Themes"** button

That's it! The AI will detect the 10 themes automatically.

## 🔧 Advanced Option

If you want the themes and mappings pre-created, use `mock-data-theme-detection.sql`:

1. Open the file
2. Replace these two values at the top:
   ```sql
   v_project_id UUID := 'YOUR_PROJECT_ID_HERE';
   v_board_id UUID := 'YOUR_BOARD_ID_HERE';
   ```
3. Run the entire DO block
4. Navigate to AI Insights page (themes will already be detected)

## 📸 What You'll See

### Themes Overview Tab
- 10 theme cards with metrics
- Dark Mode marked as "Emerging" with 🔥 icon
- Color-coded by sentiment (green/red/gray borders)
- Frequency and sentiment scores

### Emerging Themes Alert
- Orange alert box at the top
- Shows "Dark Mode Request" as rapidly growing
- Quick action buttons

### Theme Clusters Tab
- Themes grouped by category:
  - Feature Requests
  - Bug Reports
  - Performance
  - Integrations
  - Documentation & Support
  - Other

### Grouped Feedback Tab
- All 44 posts organized by their themes
- Expandable sections
- Sentiment badges on each post

### Sentiment Analysis Tab
- Distribution charts
- Trend over time
- Mix of positive, negative, and neutral

## 🎨 Visual Examples

**Emerging Theme Card:**
```
🔥 Dark Mode Request                    +0.45
Multiple requests for dark theme...
23 mentions  |  Positive  |  Emerging
```

**Negative Theme Card:**
```
Mobile App Bugs                         -0.65
Users reporting crashes and issues...
7 mentions  |  Negative  |  Action Needed
```

## 🧹 Cleanup

To remove all mock data:

```sql
-- Delete posts created by mock data
DELETE FROM posts
WHERE project_id = 'YOUR_PROJECT_ID'
AND created_at >= NOW() - INTERVAL '30 days';

-- Themes and mappings will cascade delete automatically
```

## ⚡ Tips

1. **Try Re-analysis**: Click "Re-analyze Themes" multiple times to see how the AI consistently identifies the same patterns
2. **Modify Data**: Edit the mock posts to test different scenarios
3. **Test Filters**: Use search and sentiment filters in the Themes Overview
4. **Compare Trends**: Add more posts over time to see theme growth
5. **Export**: Test the CSV export functionality with the mock themes

## 🐛 Troubleshooting

**"No themes detected"**
- Make sure you clicked "Re-analyze Themes"
- Check that posts were inserted (run `SELECT COUNT(*) FROM posts WHERE project_id = 'YOUR_ID'`)

**"Database error"**
- Verify your project_id and board_id are correct
- Make sure you have Pro plan (or theme detection enabled)

**"Themes don't match posts"**
- The AI might group them differently - that's okay!
- Try the advanced option to pre-create specific mappings

## 📝 Customization

Feel free to modify the mock data:
- Change post titles/descriptions
- Adjust sentiment scores
- Add more posts to existing themes
- Create new theme categories
- Modify vote counts and dates

Have fun exploring the Theme Detection feature! 🎉
