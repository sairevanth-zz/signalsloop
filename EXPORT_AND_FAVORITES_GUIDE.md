# Export & Favorites Guide

## Export Functionality

### Current Implementation: HTML Export ✅

**What You Get:**
- Download formatted HTML report
- Professional styling with all components
- Can be opened in any browser
- Can be printed to PDF using browser's print function

**Why HTML instead of PDF?**

True PDF generation requires additional npm packages:
```bash
npm install jspdf html2canvas
```

We implemented HTML export because:
1. ✅ Works immediately without extra dependencies
2. ✅ Smaller bundle size (better for Vercel free tier)
3. ✅ Easier to maintain and customize
4. ✅ Users can convert to PDF easily via browser print

### How to Convert HTML to PDF

**Option 1: Browser Print** (Easiest)
1. Click [Export HTML] button
2. Download the .html file
3. Open it in your browser
4. Press Ctrl+P (Windows) or Cmd+P (Mac)
5. Select "Save as PDF"
6. Click Save

**Option 2: Enable True PDF Export**

If you want direct PDF download, add this to your project:

1. Install dependencies:
```bash
cd /Users/revanth/signalloop
npm install jspdf html2canvas @types/jspdf
```

2. The code is already prepared in `src/lib/stakeholder/pdf-export.ts` (commented out)

3. Uncomment the function `exportToPDFWithCanvas()` (lines 31-64)

4. Update the export button to use the new function:
```typescript
// In stakeholder/page.tsx
import { exportToPDFWithCanvas } from '@/lib/stakeholder/pdf-export';

// In handleExport:
await exportToPDFWithCanvas(
  document.getElementById('response-container'),
  `stakeholder-report-${Date.now()}.pdf`
);
```

5. Rebuild and deploy

**Trade-offs:**
- ✅ Direct PDF download
- ❌ Larger bundle size (+500KB)
- ❌ More expensive Vercel builds
- ❌ Slower export process

---

## Favorites Functionality

### How to Mark Queries as Favorite

**Location:** Query History Page

**Steps:**
1. Navigate to: Dashboard → Stakeholder Intelligence → [History] button
2. Find a query you want to save
3. Click the **Star icon** (⭐) on the right side of the query card
4. Star turns yellow when favorited
5. Click again to unfavorite

### How to View Only Favorites

**Steps:**
1. Go to Query History page
2. Click the **[Favorites Only]** button near the top
3. Button turns blue when active
4. See only your starred queries
5. Click again to show all queries

### Where Favorites Appear

| Page | Favorites Visible? | Actions Available |
|------|-------------------|-------------------|
| Main Stakeholder Page | ❌ No | N/A |
| Query History Page | ✅ Yes | Star, Unstar, Filter |
| Analytics Page | ❌ No | N/A |

**Why not on main page?**
- Main page is for asking new queries
- History page is for managing past queries
- Keeps UI focused and uncluttered

### Visual Indicators

**Unfavorited Query:**
```
┌─────────────────────────────────────────┐
│ [☆] Product                             │
│ "What are the top customer themes?"     │
│ 3 components • 2.5s                     │
│                           [☆] [▶] [🗑]  │
└─────────────────────────────────────────┘
```

**Favorited Query:**
```
┌─────────────────────────────────────────┐
│ [★] Product                             │
│ "What are the top customer themes?"     │
│ 3 components • 2.5s                     │
│                           [★] [▶] [🗑]  │
└─────────────────────────────────────────┘
```

Stars are yellow (★) when favorited, outlined (☆) when not.

---

## Complete Feature Location Guide

### Main Stakeholder Intelligence Page
**URL:** `/dashboard/[projectId]/stakeholder`

**Features Available:**
- ✅ Ask queries
- ✅ See responses with components
- ✅ Export responses (HTML)
- ✅ Click follow-up questions
- ✅ Switch roles
- ❌ NOT favorites (go to History for that)

**Buttons in Header:**
- [History] → View past queries
- [Analytics] → View usage metrics
- Role Selector → Change perspective

**Buttons on Each Response:**
- [Export HTML] → Download report

---

### Query History Page
**URL:** `/dashboard/[projectId]/stakeholder/history`

**Features Available:**
- ✅ View all past queries
- ✅ Filter by role
- ✅ Sort (Recent, Oldest, Rating, Performance)
- ✅ **Mark as favorite** (star icon)
- ✅ **Filter favorites only** (toggle button)
- ✅ Re-run queries
- ✅ Delete queries

**Buttons in Header:**
- [New Query] → Ask new query

**Buttons in Filters Area:**
- Role dropdown → Filter by role
- Sort dropdown → Sort results
- [Favorites Only] → Toggle favorites filter

**Buttons on Each Query:**
- [☆/★] → Toggle favorite
- [▶ Re-run] → Run query again
- [🗑 Delete] → Remove from history

---

### Analytics Dashboard Page
**URL:** `/dashboard/[projectId]/stakeholder/analytics`

**Features Available:**
- ✅ View metrics (queries, time, rating, roles)
- ✅ See charts (by role, distribution, performance)
- ✅ View popular queries
- ✅ Change time range (7d/30d/90d)
- ❌ NOT favorites (go to History for that)

**Buttons in Header:**
- [Back] → Return to main page
- [History] → View past queries
- [New Query] → Ask new query

---

## Quick Reference

### "I want to export a report"
→ Main page → Click [Export HTML] on any response → Opens in browser → Print to PDF

### "I want to mark a query as favorite"
→ History page → Click star icon (☆) next to query → Star turns yellow (★)

### "I want to see only my favorites"
→ History page → Click [Favorites Only] button → Button turns blue

### "I want to re-run a past query"
→ History page → Find query → Click [Re-run] button

### "I want to see usage analytics"
→ Main page → Click [Analytics] button → View charts and metrics

### "My queries aren't showing in history"
→ **Fixed in latest update!** Make sure you're logged in and queries will now save automatically.

---

## Troubleshooting

### Issue: No queries in history/analytics

**Cause:** Queries weren't being saved to database (missing auth token)

**Status:** ✅ FIXED in latest commit

**What Changed:**
- Frontend now sends authentication token with each query
- Queries are saved to database automatically
- History and analytics will populate correctly

**Action Required:**
- Pull latest changes: `git pull`
- Queries will now save properly

### Issue: Can't find favorites

**Location:** Favorites are ONLY on the Query History page

**Steps:**
1. Main page → Click [History] button
2. Look for star icons (☆) on each query
3. Click star to favorite
4. Click [Favorites Only] toggle to filter

### Issue: Want PDF instead of HTML

**Solutions:**
1. **Quick:** Use browser print (Ctrl+P / Cmd+P) → Save as PDF
2. **Advanced:** Install jspdf + html2canvas (see instructions above)

---

## Summary

| Feature | Where to Find It | How to Use |
|---------|-----------------|------------|
| Export Reports | Main page, each response | Click [Export HTML], then print to PDF |
| Mark Favorite | History page, each query | Click star icon (☆ → ★) |
| View Favorites | History page | Click [Favorites Only] toggle |
| View History | Main page header | Click [History] button |
| View Analytics | Main page header | Click [Analytics] button |
| Re-run Query | History page | Click [▶ Re-run] button |

All features are now working correctly after the latest fixes! 🎉
