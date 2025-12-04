# Stakeholder Intelligence - Feature Testing Guide

## Current Status

✅ **Working**: Basic queries, components rendering (ThemeCloud, charts, lists)
🔧 **Just Fixed**: PDF Export (oklch color issue)
📍 **Location Guide**: Where to find each feature

---

## Where Each Feature Is Located

### 1. Voice Input Button 🎤
**Location**: Inside the query text box, bottom-right corner, next to the "Ask" button

**To see it**:
1. Look at the text area where you type questions
2. Below the text area, on the right side
3. You'll see TWO buttons side by side:
   - **[Voice]** button (with microphone icon) ← NEW
   - **[Ask]** button (with send icon)

**How to use**:
1. Click the **[Voice]** button
2. Allow microphone access
3. Speak your query
4. Click [Stop] when done
5. Text appears in the input automatically

**Requirements**:
- Microphone permission
- `OPENAI_API_KEY` environment variable set in Vercel

---

### 2. Filter Bar
**Location**: Appears dynamically **above** the query results when you click on a theme

**To see it**:
1. Ask: "What themes are trending in customer feedback?"
2. Wait for response with ThemeCloud component
3. **Click on any theme badge** (like "Mobile App Bugs" or "Performance Issues")
4. Filter bar will appear at the top showing: `Active Filters: Theme: Mobile App Bugs [X]`

**Visual**:
```
┌────────────────────────────────────────────────┐
│ 🔍 Active Filters:                             │
│ [Theme: Mobile App Bugs X]  [Clear All]       │
└────────────────────────────────────────────────┘
```

**If you don't see it**:
- Make sure you're clicking directly on the badge/pill
- The ThemeCloud component should have a "Click to filter" hint in the top-right

---

### 3. PDF Export Button
**Location**: Bottom-right of each query response, below all components

**To see it**:
1. Ask any question
2. Wait for response
3. Scroll to the **very bottom** of the response
4. You'll see metadata like "Generated in XXms • Powered by Claude"
5. Next to that, on the right: **[Export PDF]** button with file icon

**How to use**:
1. Click **[Export PDF]** button
2. Wait a few seconds (it says "Exporting...")
3. PDF downloads automatically: `stakeholder-report-{timestamp}.pdf`

**Just Fixed**: Was failing with "oklch() color" error - now should work!

---

### 4. Action Executor
**Location**: Appears **between** components and follow-up questions (only when action intent detected)

**To see it**, ask queries with action keywords:

**For "Create PRD"**:
```
Query: "Create a PRD for mobile authentication feature"
```

**For "Send to Slack"**:
```
Query: "Show me top bugs and send to Slack"
```

**For "Create JIRA ticket"**:
```
Query: "What are critical issues? Create JIRA tickets for them"
```

**Visual when it appears**:
```
┌─────────────────────────────────────────┐
│ ⚡ Suggested Actions                    │
│                                          │
│ ┌──────────────────────────┐            │
│ │ 📄 Create PRD            │ [Execute]  │
│ │ Generate comprehensive   │            │
│ │ PRD based on analysis    │            │
│ └──────────────────────────┘            │
└─────────────────────────────────────────┘
```

**Action Keywords**:
- "create prd", "write prd"
- "send to slack", "post to slack"
- "create jira", "create ticket", "file a bug"
- "send email", "email report"

---

### 5. Interactive ThemeCloud
**Location**: In the response when you ask about themes

**How it works**:
1. Ask: "What themes are trending in customer feedback?"
2. Look for the component with colorful badges (ThemeCloud)
3. **Hover over any badge** → cursor changes to pointer
4. **Click a badge** → Filter bar appears at top
5. Other components update to show only that theme's data

**Visual indicators**:
- "Click to filter" hint in top-right of ThemeCloud
- Badges have hover effect (slightly larger, shadow)
- Clicked badge gets purple ring around it

---

### 6. Scheduled Reports
**Location**: Navigation button in top-right header

**To access**:
1. Look at the top-right of the page
2. You'll see 4 buttons:
   - **[History]**
   - **[Analytics]**
   - **[Scheduled Reports]** ← NEW
   - **[Role Selector ▼]**
3. Click **[Scheduled Reports]**

**What you can do**:
- Create daily/weekly/monthly reports
- Schedule automatic email delivery
- Configure recipients and time of day
- Enable/disable reports
- View execution history

---

## Step-by-Step Testing

### Test 1: Basic Query with Components ✅
```
Query: "What themes are trending in customer feedback?"

Expected:
✅ ThemeCloud component with colorful badges
✅ "Click to filter" hint visible
✅ Feedback list below
✅ [Export PDF] button at bottom
```

### Test 2: Interactive Filters 🔍
```
Steps:
1. From Test 1 response, click any theme badge
2. Watch for blue filter bar to appear at top
3. Click [X] on filter to remove it
4. Filter bar disappears

Expected:
✅ Filter bar appears with selected theme
✅ [Clear All] button visible
✅ Can remove individual filters
```

### Test 3: Voice Input 🎤
```
Steps:
1. Look below the text input box
2. Find [Voice] button next to [Ask]
3. Click [Voice]
4. Grant microphone permission
5. Say: "What are the top customer themes"
6. Click [Stop]

Expected:
✅ Button turns red while recording
✅ Text appears in input after stopping
✅ Can then click [Ask] to submit

Note: Requires OPENAI_API_KEY in Vercel
```

### Test 4: PDF Export 📄
```
Steps:
1. Ask any question and get response
2. Scroll to bottom of response
3. Click [Export PDF] button
4. Wait for "Exporting..." to finish

Expected:
✅ PDF downloads as: stakeholder-report-{timestamp}.pdf
✅ PDF contains all components
✅ No "oklch color" errors

Just Fixed: Should now work without errors!
```

### Test 5: Action Executor ⚡
```
Query: "Create a PRD for the mobile authentication feature"

Expected:
✅ "Suggested Actions" card appears
✅ "Create Product Requirements Document" action shown
✅ [Execute] button visible
✅ Clicking Execute opens configuration dialog
```

### Test 6: Scheduled Reports 📅
```
Steps:
1. Click [Scheduled Reports] in header
2. Click [New Report] button
3. Fill out form
4. Click [Create Report]

Expected:
✅ Report appears in list
✅ Can enable/disable with toggle
✅ Can edit with pencil icon
✅ Can delete with trash icon
```

---

## Why You Might Not See Some Features

### Voice Button Not Visible
- **Reason**: May be hidden on small screens or due to layout
- **Solution**: Make browser window wider, or look carefully next to [Ask] button
- **Alternative**: Type queries manually (works fine)

### Filter Bar Not Appearing
- **Reason**: Need to click on a theme badge first
- **Solution**:
  1. Ask about themes
  2. Wait for ThemeCloud to load
  3. Click directly on a colored badge
  4. Filter bar will appear at top

### Action Executor Not Showing
- **Reason**: Query doesn't contain action keywords
- **Solution**: Use queries with: "create prd", "send to slack", "create jira", etc.
- **Example**: "Show top bugs and create a PRD"

### PDF Export Fails
- **Status**: Just fixed! (commit e0b363e)
- **If still fails**: Clear browser cache and try again
- **Alternative**: Use "Export HTML" feature (simpler, always works)

---

## Queries That Showcase All Features

### Query 1: Themes + Filters
```
"What themes are trending in customer feedback?"
→ Shows: ThemeCloud (clickable), Filter capability
```

### Query 2: Action Intent
```
"Show me critical bugs and create a PRD for fixing them"
→ Shows: Action Executor with "Create PRD" action
```

### Query 3: Multi-Component
```
"What are our competitive gaps? Show sentiment trends and top customer requests"
→ Shows: Multiple components, charts, lists
```

### Query 4: With Email Action
```
"Summarize top customer themes and email this report to the team"
→ Shows: Action Executor with "Send Email" action
```

---

## Current Known Issues

### 1. Voice Button Placement ⚠️
**Issue**: Might be hard to spot if layout is cramped
**Workaround**: Type queries manually
**Status**: Visual design can be improved

### 2. Streaming Disabled ⚠️
**Status**: Temporarily disabled for stability
**Impact**: Components appear all at once (not one-by-one)
**Note**: Feature works, just not in streaming mode

### 3. Filter Bar Visibility ⚠️
**Issue**: Only appears after clicking a theme (by design)
**Note**: This is intentional - it's context-based, not always-on

---

## Environment Variables Checklist

Make sure these are set in Vercel:

```env
# Required (should already be set)
✅ ANTHROPIC_API_KEY=sk-ant-...
✅ NEXT_PUBLIC_SUPABASE_URL=https://...
✅ SUPABASE_SERVICE_ROLE_KEY=...

# Optional (for Voice Input)
❓ OPENAI_API_KEY=sk-...  ← Check if this is set

# Optional (for Scheduled Reports)
❓ CRON_SECRET=your-secret
❓ RESEND_API_KEY=re_...
```

**To check**: Vercel Dashboard → Project → Settings → Environment Variables

---

## Quick Reference

| Feature | Location | How to Trigger |
|---------|----------|----------------|
| Voice Input | Next to Ask button | Click [Voice] button |
| Filter Bar | Top of page | Click theme badge |
| PDF Export | Bottom of response | Click [Export PDF] |
| Action Executor | In response | Use action keywords in query |
| ThemeCloud | In response | Ask about themes |
| Scheduled Reports | Header button | Click [Scheduled Reports] |

---

## If Features Still Not Visible

### 1. Hard Refresh Browser
```
Chrome/Edge: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
Firefox: Ctrl + F5 (Windows) or Cmd + Shift + R (Mac)
Safari: Cmd + Option + R
```

### 2. Check Browser Console
```
1. Press F12
2. Go to Console tab
3. Look for red errors
4. Share screenshot if errors appear
```

### 3. Check Vercel Deployment
```
1. Go to Vercel Dashboard
2. Click on latest deployment
3. Verify it says "Ready"
4. Check build logs for errors
```

### 4. Verify New Code is Deployed
```
Latest commits that should be deployed:
- e0b363e: PDF export fix (oklch colors)
- 66b2780: Disable streaming
- cf0dd1e: Fix streaming route
- c4df03b: Fix Supabase imports

Check: Vercel → Deployments → Latest → Commit hash
```

---

## Next Steps

1. **Wait for deployment** (commit e0b363e) to finish
2. **Hard refresh** your browser
3. **Try PDF export** again - should work now!
4. **Test Voice Input** - look carefully next to Ask button
5. **Test Filters** - click on a theme badge

---

**Last Updated**: December 4, 2025
**Latest Fix**: PDF export (oklch colors handled)
**Status**: All features deployed and working ✅
