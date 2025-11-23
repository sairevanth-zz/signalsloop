# AI Roadmap Components Fix

## Issue

The user reported not seeing the **Impact Simulator** and **Priority History** features in the AI Roadmap page.

## Root Cause Analysis

After investigation, I found:

1. **Both components ARE integrated** in the codebase:
   - `ImpactSimulator` - Located in each recommendation card (src/components/roadmap/RecommendationCard.tsx:152-166)
   - `PriorityHistoryViewer` - Located above the roadmap list (src/components/roadmap/RoadmapDashboard.tsx:373)

2. **Database Function Issue**: The `get_recent_priority_changes` function was returning incomplete data:
   - **Missing fields**: `id`, `old_score`, `new_score`, `triggers`, `adjustment_type`, `adjusted_by_agent`
   - This caused the PriorityHistoryViewer to not render properly

## Fix Applied

### 1. Updated Database Function

Created migration: `migrations/202511230001_fix_priority_changes_function.sql`

The function now returns all required fields:
```sql
RETURNS TABLE (
    id UUID,
    theme_name TEXT,
    old_priority TEXT,
    new_priority TEXT,
    old_score DECIMAL,
    new_score DECIMAL,
    score_change DECIMAL,
    adjustment_reason TEXT,
    triggers TEXT[],
    adjustment_type TEXT,
    adjusted_by_agent TEXT,
    created_at TIMESTAMPTZ
)
```

### 2. Created Migration Script

Created: `scripts/fix-priority-history.ts`

Added npm script: `npm run fix-priority-history`

## How to Apply the Fix

Run the migration script:

```bash
npm run fix-priority-history
```

Or manually apply via Supabase Dashboard:
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy the contents of `migrations/202511230001_fix_priority_changes_function.sql`
5. Paste and click "Run"

## Where to Find the Components

### Impact Simulator

**Location**: Inside each roadmap recommendation card

**How to use**:
1. Navigate to AI Roadmap page (`/app/roadmap?projectId=YOUR_PROJECT_ID`)
2. Look for any roadmap suggestion card
3. Click the **"Simulate Impact"** button in the top-right of each card
4. A dialog will open with two options:
   - **Simulate: Build** - Predicts what happens if you build this feature
   - **Simulate: Defer** - Predicts what happens if you delay this feature

**Features**:
- Sentiment impact prediction
- Churn impact estimation
- Adoption rate forecast
- Revenue impact calculation
- Risk assessment
- Key assumptions and mitigation strategies

### Priority History Viewer

**Location**: Between the filters bar and the roadmap list

**Display conditions**:
- Shows if there are priority changes in the last 30 days
- Shows empty state if no changes exist
- Displays "No priority changes in the last 30 days" message when empty

**Features**:
- Timeline of priority changes
- Visual priority level transitions (Critical → High, etc.)
- Score change tracking
- Adjustment reasons
- Trigger indicators (feedback spike, sentiment drop, etc.)
- Agent attribution for automatic adjustments

## Visibility Notes

### Why you might not see Priority History:

1. **No data yet**: The feature requires priority changes to be recorded
2. **Database function not updated**: Run the migration to fix this
3. **No automatic adjustments**: The Dynamic Roadmap Agent needs to make adjustments

### Why you might not see Impact Simulator:

The Impact Simulator IS visible, but it's a **button** in each recommendation card, not a standalone section. Look for the "Simulate Impact" button with a LineChart icon.

## Testing the Features

### Test Priority History:

1. Ensure migration is applied
2. Generate some roadmap suggestions
3. Manually update priorities or let the Dynamic Roadmap Agent adjust them
4. Priority changes will appear in the history viewer

### Test Impact Simulator:

1. Navigate to AI Roadmap
2. Generate roadmap suggestions (click "Generate Roadmap")
3. Look at any suggestion card
4. Click "Simulate Impact" button in the top-right corner
5. Choose "Build" or "Defer" to see predictions

## Files Modified

- ✅ `migrations/202511230001_fix_priority_changes_function.sql` (created)
- ✅ `scripts/fix-priority-history.ts` (created)
- ✅ `package.json` (added `fix-priority-history` script)

## Files Verified (Already Correct)

- ✅ `src/components/roadmap/ImpactSimulator.tsx`
- ✅ `src/components/roadmap/PriorityHistoryViewer.tsx`
- ✅ `src/components/roadmap/RoadmapDashboard.tsx`
- ✅ `src/components/roadmap/RecommendationCard.tsx`
- ✅ `src/components/roadmap/index.ts`

## Next Steps

1. Run the migration: `npm run fix-priority-history`
2. Restart your development server
3. Navigate to `/app/roadmap?projectId=YOUR_PROJECT_ID`
4. Click "Generate Roadmap" if you don't have suggestions
5. Look for:
   - **Impact Simulator button** in each recommendation card (top-right)
   - **Priority History section** above the roadmap list (may be empty initially)

## Support

If you still don't see the components after applying the fix:
- Check browser console for errors
- Verify the migration was applied successfully
- Ensure you have roadmap suggestions generated
- Check that you're viewing the correct project ID
