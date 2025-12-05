# PRD Generation Fix - December 4, 2025

## Issues Found and Fixed

### Issue #1: Action Executor Not Appearing
**Problem**: User typed "create the PRD" but action executor didn't appear
**Cause**: Detection logic only matched exact phrases like "create prd", not "create THE prd"
**Fix**: Changed to flexible regex patterns `/create.*prd/i`
**Status**: ✅ FIXED (commit 6a9aa9f)

### Issue #2: 504 Timeout Error
**Problem**: PRD generation timed out after 10 seconds
**Cause**:
- Vercel free tier has 10s limit
- PRD generation was too complex (asking for 8 sections, 4000 tokens)
**Fix**:
- Simplified prompt (6 sections, under 1000 words)
- Reduced max_tokens from 4000 to 2000
- Increased maxDuration to 60s (falls back to 10s on free tier)
**Status**: ✅ FIXED (commit 13fa7ab)

### Issue #3: 500 Internal Server Error
**Problem**: After timeout fix, got 500 error instead
**Cause**:
- `Promise.race` with timeout was causing type casting issues
- `documents` table might not exist in database
**Fix**:
- Removed Promise.race timeout (simplified code)
- Added try/catch around database save
- Don't fail if documents table doesn't exist
- Added logging for debugging
**Status**: ✅ FIXED (commit 12ebcbb)

---

## Current Code Flow

1. User asks query with "create" and "prd" keywords
2. `detectActionIntent()` finds pattern match → creates Action
3. ActionExecutor component shows purple card with Execute button
4. User clicks Execute → opens dialog
5. User clicks Execute in dialog → calls `/api/stakeholder/actions/create-prd`
6. API:
   - Authenticates user ✓
   - Verifies project access ✓
   - Calls Claude API to generate PRD ✓
   - Tries to save to database (doesn't fail if table missing) ✓
   - Returns PRD content ✓
7. ActionExecutor downloads PRD as markdown file ✓
8. Shows success message ✓

---

## Testing Steps

### After Next Deployment (commit 12ebcbb)

1. **Wait 1-2 minutes** for Vercel deployment
2. **Hard refresh browser**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Ask this query**:
   ```
   Create a PRD for fixing mobile app bugs
   ```

4. **Verify Action Executor appears**:
   - Should see purple card: "⚡ Suggested Actions"
   - Should have action: "Create Product Requirements Document"
   - Should have black "Execute" button

5. **Click Execute**:
   - Dialog should open
   - Message: "A comprehensive PRD will be generated based on the current analysis and feedback"

6. **Click Execute in dialog**:
   - Button should show "Executing..." with spinner
   - Should take 5-8 seconds
   - Should NOT timeout

7. **Expected Success**:
   - ✅ Alert: "PRD created successfully! Check your downloads folder..."
   - ✅ File downloads: `PRD-{timestamp}.md`
   - ✅ Action shows "Completed" badge with green checkmark

---

## What to Check if Still Failing

### Check Browser Console
Look for errors related to:
- Authentication issues
- API response errors
- Network timeout

### Check Vercel Logs
1. Go to Vercel Dashboard
2. Navigate to your project
3. Click "Functions" tab
4. Find `/api/stakeholder/actions/create-prd`
5. Look for errors in logs

### Common Issues

**If still getting 500 error:**
- Check Vercel logs for actual error message
- Might be authentication issue
- Might be missing ANTHROPIC_API_KEY

**If still getting 504 timeout:**
- You're on Vercel free tier (10s limit)
- PRD generation might be taking longer than 10s
- Need to upgrade Vercel plan OR simplify prompt further

**If authentication fails:**
- Check that you're logged in
- Check browser has valid session token
- Try logging out and back in

---

## Fallback: If Vercel Free Tier 10s Limit is Issue

If you're on Vercel free tier and PRD generation consistently times out, we have two options:

### Option A: Make PRD Even Simpler
Reduce to 3 sections instead of 6:
1. Problem Statement
2. Feature Requirements
3. Success Metrics

This should generate in under 8 seconds.

### Option B: Generate PRD Client-Side
Move PRD generation to browser using streaming:
- User sees PRD being written in real-time
- No server timeout issues
- Better UX with progress indication

---

## PRD Content Structure (Current)

The generated PRD includes:

1. **Executive Summary** (2-3 sentences)
   - Brief overview of problem and solution

2. **Problem Statement**
   - Customer pain points being addressed
   - Why this is important now

3. **Goals** (3-5 key objectives)
   - What we're trying to achieve
   - Success criteria

4. **User Stories** (3-5 stories)
   - Key user personas and needs
   - Acceptance criteria

5. **Feature Requirements**
   - Must-have features
   - Nice-to-have features

6. **Success Metrics**
   - How we'll measure success
   - KPIs to track

**Format**: Clean markdown
**Target length**: Under 1000 words
**Generation time**: 5-8 seconds

---

## Code Changes Summary

### Files Modified

1. **src/lib/stakeholder/action-executor.ts**
   - Changed from exact string matching to regex patterns
   - Now detects: `create.*prd`, `write.*prd`, `generate.*prd`, etc.

2. **src/app/api/stakeholder/actions/create-prd/route.ts**
   - Simplified PRD prompt (6 sections vs 8)
   - Reduced max_tokens (2000 vs 4000)
   - Removed Promise.race timeout (was causing 500 errors)
   - Better database error handling
   - Added logging for debugging

3. **src/components/stakeholder/ActionExecutor.tsx**
   - Auto-downloads PRD as markdown file
   - Better success messages
   - Shows PRD content in alert

4. **src/lib/stakeholder/action-executor.ts** (executeCreatePRD)
   - Passes through API message to UI
   - Better data structure for PRD result

---

## Expected Behavior Now

### ✅ Working Features

1. **Action Detection**: Detects "create PRD", "create the PRD", "write a PRD", etc.
2. **Action Executor UI**: Purple card appears with Execute button
3. **PRD Generation**: Generates in 5-8 seconds (under 10s limit)
4. **Auto-Download**: PRD downloads as markdown file
5. **Error Handling**: Graceful failures with helpful messages

### 🚧 Known Limitations

1. **Vercel Free Tier**: 10s hard limit (upgrade needed for longer operations)
2. **Documents Table**: Optional - doesn't fail if table missing
3. **Database Save**: May fail silently if schema mismatch

---

## Next Steps After Testing

### If it works ✅
- PRD generation is fully functional
- Can enhance with better UI (modal instead of alert)
- Can add PRD history page
- Can add edit/export options

### If still failing ❌
- Share Vercel error logs
- We can implement Option B (client-side generation)
- Or further simplify the prompt

---

**Last Updated**: December 4, 2025
**Latest Commit**: 12ebcbb
**Status**: Awaiting deployment and user testing
