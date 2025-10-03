# Debugging: "Submit on Behalf" Button Not Visible

## Why the Button Might Not Be Visible

The "Submit on Behalf" button only appears when **ALL** of these conditions are met:

1. ✅ You are logged in
2. ✅ You are viewing a project board (e.g., `/your-project/board`)
3. ✅ You are the **owner** of the project (created the project)
4. ✅ The project data has loaded successfully

## Step-by-Step Debugging

### Step 1: Verify You're Logged In
- Check if you see the user menu in the top right
- If not logged in, go to `/login` and log in

### Step 2: Verify You're on the Board Page
- URL should be: `/{your-project-slug}/board`
- You should see the list of feedback posts

### Step 3: Verify You Own the Project
The button **only shows for project owners**. To check:

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Type this and press Enter:
   ```javascript
   // Check user and project owner
   console.log('Current path:', window.location.pathname)
   ```

4. Look at the Network tab:
   - Find the request to `projects?slug=...`
   - Check the response - look for `owner_id`
   - Compare `owner_id` with your user ID (from Supabase auth)

### Step 4: Force Rebuild and Restart Dev Server

```bash
# Stop the dev server (Ctrl+C)
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# Start dev server
npm run dev
```

Then visit the board page again.

### Step 5: Check Browser Console for Errors

1. Open DevTools Console (F12)
2. Look for any red error messages
3. Common issues:
   - Import errors for `FeedbackOnBehalfModal`
   - Missing `FileText` icon import
   - Authentication errors

### Step 6: Manual Check in Code

Open `src/app/[slug]/board/page.tsx` and search for:
```typescript
{isProjectOwner && project && (
  <Button
    onClick={() => setShowFeedbackOnBehalfModal(true)}
```

This should be around line 536-546.

### Step 7: Add Debug Logging

Temporarily add this code in `src/app/[slug]/board/page.tsx` after the `loadProjectAndPosts` function (around line 338):

```typescript
// Add this useEffect for debugging
useEffect(() => {
  console.log('🔍 DEBUG INFO:');
  console.log('User:', user);
  console.log('Project:', project);
  console.log('isProjectOwner:', isProjectOwner);
  console.log('Should show button:', isProjectOwner && !!project);
}, [user, project, isProjectOwner]);
```

This will log the state to the console every time it changes.

### Step 8: Check User ID Match

In Supabase Dashboard:
1. Go to Authentication → Users
2. Find your user and note the UUID
3. Go to Table Editor → projects
4. Find your project and check the `owner_id` column
5. Verify they match

## Expected Behavior

When everything is working correctly, you should see:

**Button Location**: Top right area, between the "AI Insights" button and "Submit Feedback" button

**Button Appearance**:
- Text: "Submit on Behalf" (desktop) or "On Behalf" (mobile)
- Color: Green background with green border
- Icon: FileText icon (document icon)

**Screenshot of where it should be**:
```
[Export] [Roadmap] [Settings] [AI Insights] [🟢 Submit on Behalf] [🔵 Submit Feedback]
                                              ↑ HERE (green)         ↑ Regular button (blue)
```

## Testing with Another User

If you want to verify the button only shows for owners:

1. Log out
2. Create a new account
3. Visit your project board
4. The "Submit on Behalf" button should NOT appear
5. Only the regular "Submit Feedback" button should show

## Quick Test Commands

Run these in your terminal to verify files exist:

```bash
# Check component exists
ls -la src/components/FeedbackOnBehalfModal.tsx

# Check API route exists
ls -la src/app/api/feedback/on-behalf/route.ts

# Check dashboard page exists
ls -la src/app/[slug]/settings/feedback/page.tsx

# Search for the button in board page
grep -n "Submit on Behalf" src/app/[slug]/board/page.tsx
```

Expected output:
```
src/app/[slug]/board/page.tsx:543:                  <span className="text-sm font-semibold hidden lg:inline">Submit on Behalf</span>
```

## Still Not Working?

If after all these steps the button still doesn't show:

1. **Hard refresh the browser**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Clear browser cache**: Go to DevTools → Application → Clear site data
3. **Try incognito/private mode**
4. **Check if user state is being set**: Add `console.log('User state:', user)` in the component

## Alternative: Temporarily Show for All Users (Testing Only)

If you want to test the functionality, temporarily change this in `src/app/[slug]/board/page.tsx` (line ~536):

```typescript
// BEFORE (only owners)
{isProjectOwner && project && (

// AFTER (show for everyone - FOR TESTING ONLY)
{project && (
```

**⚠️ IMPORTANT**: Remember to change it back to `isProjectOwner && project &&` after testing!

## Contact Support

If none of these steps work, please provide:
1. Browser console logs
2. Network tab showing the projects API request/response
3. Your user ID from Supabase
4. The project slug you're trying to access
