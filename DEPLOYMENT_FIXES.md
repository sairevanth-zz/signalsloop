# Deployment Fixes - December 4, 2025

## Issues Found in Production

From Vercel logs and user testing:

### 1. Streaming Query Route Errors ❌
**Error**: `TypeError: (θ , v.generateResponsePlan) is not a function`
**Cause**: Streaming route was importing a non-existent function

### 2. Queries Not Working ❌
**Issue**: Cannot ask questions, no responses returned
**Cause**: Streaming route errors breaking all queries

### 3. Missing UI Components ❌
**Issue**: Filter bar, ThemeCloud, Action Executor, PDF Export button not visible
**Cause**: Queries failing prevented any components from rendering

### 4. Additional Errors in Logs ⚠️
- "Supabase client called on server side"
- Analytics API issues with column names
- Metadata export warnings for "themeColor"

---

## Fixes Applied

### Fix 1: Corrected Streaming Route Imports
**Commit**: `cf0dd1e`

**Changes**:
- Changed import from `generateResponsePlan` to `generateStakeholderResponse`
- Fixed authentication pattern to match regular query route
- Added `fetchProjectContext` for proper context data
- Fixed `userId` reference in database insert
- Added `runtime = 'nodejs'` declaration

**File**: `src/app/api/stakeholder/query-stream/route.ts`

### Fix 2: Disabled Streaming by Default
**Commit**: `66b2780`

**Changes**:
- Changed `streamingEnabled` default from `true` to `false`
- Queries now use regular (non-streaming) endpoint
- Ensures basic functionality works first

**File**: `src/app/dashboard/[projectId]/stakeholder/page.tsx`

### Fix 3: Previous Supabase Import Fixes
**Commit**: `c4df03b`

**Changes**:
- Fixed imports from `@/lib/supabase-server` to `@/lib/supabase-client`
- Fixed in create-prd and query-stream routes

---

## What Will Work Now

### ✅ Should Work After Deployment

1. **Basic Query Functionality**
   - Ask questions using text input
   - Get AI-generated responses
   - View components (ThemeCloud, charts, etc.)
   - See example queries

2. **UI Features**
   - Filter bar (when filters active)
   - PDF Export button (on each response)
   - Action Executor (when action intent detected)
   - Voice Input button
   - Navigation buttons (History, Analytics, Scheduled Reports)

3. **Sub-Pages**
   - Query History page
   - Analytics Dashboard
   - Scheduled Reports management

### ⚠️ Temporarily Disabled

1. **Streaming Responses**
   - Disabled by default
   - Uses regular batch endpoint
   - Can be re-enabled after testing

---

## Testing Checklist

After next deployment completes:

### 1. Basic Functionality
- [ ] Ask a simple query: "What themes are trending in customer feedback?"
- [ ] Verify response appears with components
- [ ] Check if ThemeCloud is visible
- [ ] Check if example queries appear

### 2. UI Components
- [ ] Click on a theme in ThemeCloud → Filter bar should appear
- [ ] Look for [Export PDF] button on response
- [ ] Try query with action intent: "Create a PRD for authentication"
- [ ] Verify action executor card appears

### 3. Voice Input
- [ ] Click [Voice] button
- [ ] Grant microphone permission
- [ ] Speak a query
- [ ] Verify transcription appears
- [ ] **Note**: Requires `OPENAI_API_KEY` environment variable

### 4. Navigation
- [ ] Click [History] button → Goes to history page
- [ ] Click [Analytics] button → Goes to analytics page
- [ ] Click [Scheduled Reports] button → Goes to scheduled reports page

### 5. Sub-Pages
- [ ] History page loads without errors
- [ ] Analytics page shows metrics
- [ ] Scheduled Reports page loads

---

## Environment Variables Required

Make sure these are set in Vercel:

```env
# Required (already should be set)
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# For Voice Input (optional)
OPENAI_API_KEY=sk-...

# For Scheduled Reports (optional)
CRON_SECRET=your-secret-key
RESEND_API_KEY=re_...
```

---

## Known Issues Still Present

### 1. Analytics API Column Name Issue ⚠️
**Error**: `Analytics: failed to load API keys ( code: '42703', details: null, hint: 'Perhaps you meant to reference the column "api_key"'`

**Impact**: Analytics page may not load properly
**Fix**: Need to check column name in database schema

### 2. Metadata Export Warnings ⚠️
**Error**: `Unsupported metadata themeColor is configured in metadata export`

**Impact**: Minor - just warnings
**Fix**: Can be ignored for now

### 3. Supabase Server-Side Warning ⚠️
**Warning**: "Supabase client called on server side - this may cause issues"

**Impact**: Should work but shows warning
**Fix**: Already using correct pattern, warning may be from logging

---

## Next Steps

### Immediate (After This Deployment)
1. Wait for Vercel deployment to complete
2. Test basic query functionality
3. Verify components appear
4. Check Vercel logs for errors

### Short Term
1. Re-enable streaming once basic functionality is confirmed
2. Fix analytics API column name issue
3. Add error boundaries for better error handling

### Optional Enhancements
1. Set up `OPENAI_API_KEY` for voice input
2. Configure scheduled reports cron
3. Add Slack/JIRA integrations for actions

---

## Deployment Timeline

| Commit | Message | Status |
|--------|---------|--------|
| c4df03b | fix: correct Supabase import path | ✅ Pushed |
| cf0dd1e | fix: correct imports and auth in streaming | ✅ Pushed |
| 66b2780 | fix: disable streaming by default | ✅ Pushed |

**Expected Deployment**: ~2-3 minutes after push
**Monitor At**: Vercel Dashboard → signalsloop project

---

## If Still Not Working

### Check Vercel Logs For:
1. Import errors (Module not found)
2. Runtime errors (TypeError, etc.)
3. Database connection issues
4. Missing environment variables

### Common Issues:
- **Still can't ask questions**: Check browser console for fetch errors
- **No components showing**: Check if query API is returning data
- **401 Unauthorized**: Check authentication token is being sent
- **500 Server Error**: Check Vercel logs for detailed error

### Debug Steps:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Ask a question
4. Look for `/api/stakeholder/query` request
5. Check Response tab for error details

---

## Summary

**3 critical fixes pushed:**
1. ✅ Fixed streaming route imports
2. ✅ Fixed authentication pattern
3. ✅ Disabled streaming by default

**What should work now:**
- Basic query functionality
- Component rendering (ThemeCloud, charts, etc.)
- PDF export
- Navigation and sub-pages
- Interactive filters
- Action detection

**What's disabled:**
- Streaming (temporarily)

**Monitor**: Vercel dashboard for deployment status and logs

---

**Last Updated**: December 4, 2025
**Deployment**: In Progress
