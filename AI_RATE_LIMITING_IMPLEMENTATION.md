# AI Rate Limiting Implementation

## Overview

Comprehensive rate limiting has been implemented for all AI features to prevent abuse and bot attacks while ensuring legitimate users have generous limits.

## Rate Limits

### Free Plan
Monthly limits designed for normal usage:
- **Sentiment Analysis**: 10/month
- **Auto-Response**: 25/month
- **Duplicate Detection**: 15/month
- **Priority Scoring**: 15/month
- **Categorization**: 50/month
- **Writing Assistant**: 100/month

### Pro Plan
High limits to prevent abuse while supporting heavy usage:
- **Sentiment Analysis**: 10,000/month
- **Auto-Response**: 5,000/month
- **Duplicate Detection**: 10,000/month
- **Priority Scoring**: 10,000/month
- **Categorization**: 50,000/month (highest - most commonly used)
- **Writing Assistant**: 20,000/month

## Key Changes

### 1. Updated AI Limits Configuration
**File**: `src/lib/ai-rate-limit.ts`

Changed from unlimited Pro access to high but capped limits:

```typescript
// Before
pro: {
  categorization: Infinity,
  // ... other features: Infinity
}

// After
pro: {
  sentiment_analysis: 10000,
  auto_response: 5000,
  duplicate_detection: 10000,
  priority_scoring: 10000,
  categorization: 50000,
  writing_assistant: 20000,
}
```

**Key functions updated**:
- `checkAIUsageLimit()` - Now checks limits for both free and pro
- `incrementAIUsage()` - Now tracks usage for all users

### 2. Rate Limiting Added to API Endpoints

#### AI Categorization
**File**: `src/app/api/ai/categorize/route.ts`

- ✅ Rate limit check before processing
- ✅ Usage increment after successful categorization
- ✅ Returns usage info in response
- ✅ 429 status code with detailed error message on limit exceeded

```typescript
// Check rate limit
const usageCheck = await checkAIUsageLimit(projectId, 'categorization');
if (!usageCheck.allowed) {
  return NextResponse.json({
    error: 'Rate limit exceeded',
    message: `You've reached your monthly limit...`,
    current: usageCheck.current,
    limit: usageCheck.limit,
    remaining: usageCheck.remaining,
    isPro: usageCheck.isPro
  }, { status: 429 });
}

// After successful categorization
await incrementAIUsage(projectId, 'categorization');

// Return usage info
return NextResponse.json({
  success: true,
  result,
  usage: {
    current: usage.current + 1,
    limit: usage.limit,
    remaining: usage.remaining - 1,
    isPro: usage.isPro
  }
});
```

#### Priority Scoring
**File**: `src/app/api/ai/priority-scoring/route.ts`

- ✅ Same rate limiting pattern as categorization
- ✅ Returns usage info after successful analysis

#### Duplicate Detection
**File**: `src/app/api/ai/duplicate-detection/route.ts`

- ✅ Same rate limiting pattern as categorization
- ✅ Returns usage info after successful detection

### 3. AI Usage Indicator Component
**File**: `src/components/AIUsageIndicator.tsx`

New component to display remaining AI credits:

**Features**:
- Color-coded progress bar (blue → yellow → orange → red)
- Shows current usage, limit, and remaining count
- Different messages for free vs pro users
- Visual indicators (Sparkles, Info, AlertCircle)
- Compact mode option for inline display
- Auto-hides for Pro users with >50% remaining

**Usage**:
```tsx
<AIUsageIndicator
  current={usage.current}
  limit={usage.limit}
  remaining={usage.remaining}
  isPro={usage.isPro}
  featureName="AI categorization"
  compact={false}
/>
```

### 4. Integration in User-Facing Components

#### PostSubmissionForm
**File**: `src/components/PostSubmissionForm.tsx`

- ✅ Imports AIUsageIndicator
- ✅ Tracks aiUsage state
- ✅ Passes projectId to categorization API
- ✅ Updates usage state from API response
- ✅ Displays usage indicator after AI result
- ✅ Shows rate limit error toasts

#### FeedbackOnBehalfModal
**File**: `src/components/FeedbackOnBehalfModal.tsx`

- ✅ Same integration pattern as PostSubmissionForm
- ✅ Shows usage after categorization

## UI/UX Flow

### For Free Users

1. **Before Limit**: Shows remaining uses with blue progress bar
2. **50% Used**: Changes to yellow with warning
3. **75% Used**: Changes to orange
4. **90% Used**: Changes to red with alert icon
5. **Limit Reached**: Red bar, upgrade message, API blocks further requests

Example Display:
```
[Info Icon] Free Usage                    15/50

[████████░░░░░░░░░░] 65%

You have 35 AI categorization uses remaining this month
```

### For Pro Users

1. **Below 50% Used**: No indicator shown (clean UI)
2. **Above 50% Used**: Shows usage indicator
3. **90% Used**: Shows alert to notify approaching limit
4. **Limit Reached**: Blocks with message to try next month

Example Display (when shown):
```
[Alert Icon] Pro Usage                    4,850/5,000

[████████████████████] 97%

You have 150 AI categorization uses remaining this month
```

## API Response Format

All AI endpoints now return usage information:

```json
{
  "success": true,
  "result": { /* AI analysis result */ },
  "usage": {
    "current": 15,
    "limit": 50,
    "remaining": 35,
    "isPro": false
  }
}
```

## Error Responses

When rate limit is exceeded (HTTP 429):

```json
{
  "error": "Rate limit exceeded",
  "message": "You've reached your monthly limit of 50 AI categorizations. Upgrade to Pro for 50,000 categorizations per month!",
  "current": 50,
  "limit": 50,
  "remaining": 0,
  "isPro": false
}
```

## Database

Rate limiting uses existing infrastructure:

**Table**: `ai_usage_tracking`
- Stores usage count per project and feature type
- Auto-resets monthly (30 days)
- Tracks last reset timestamp

**Functions**:
- `increment_ai_usage(project_id, feature_type)` - Increments usage counter
- `check_ai_usage_limit(project_id, feature_type, limit)` - Checks if under limit

## Benefits

### Security
- ✅ Prevents bot attacks and abuse
- ✅ High limits don't impact legitimate users
- ✅ Pro accounts protected from runaway automation

### User Experience
- ✅ Free users see remaining credits
- ✅ Pro users have minimal UI until approaching limit
- ✅ Clear upgrade path messaging
- ✅ Graceful error handling with helpful messages

### Business
- ✅ Incentivizes Pro upgrades
- ✅ Controls AI API costs
- ✅ Protects against abuse
- ✅ Transparent usage tracking

## Testing Checklist

### Free Account Testing
- [ ] Use AI categorization feature
- [ ] Verify usage indicator appears after use
- [ ] Check progress bar updates correctly
- [ ] Test hitting the limit (50 uses)
- [ ] Verify error message and upgrade prompt
- [ ] Confirm API blocks requests at limit

### Pro Account Testing
- [ ] Use AI categorization feature
- [ ] Verify usage indicator doesn't show initially
- [ ] Use feature >50% of limit
- [ ] Verify usage indicator appears
- [ ] Test approaching limit (>90%)
- [ ] Verify alert styling and messaging
- [ ] Test hitting Pro limit (50,000 uses)
- [ ] Confirm different messaging vs free

### API Testing
- [ ] Test categorization with projectId
- [ ] Verify usage info in response
- [ ] Test without projectId (should work but not track)
- [ ] Test rate limit exceeded response
- [ ] Test monthly reset (30 days)

### UI Testing
- [ ] Verify compact mode works
- [ ] Test responsive behavior on mobile
- [ ] Check color transitions at different percentages
- [ ] Verify icons change appropriately
- [ ] Test with different feature names

## Monitoring

Track these metrics in production:

1. **Usage Patterns**
   - Average AI feature usage per user
   - % of free users hitting limits
   - % of pro users hitting limits

2. **Conversion Metrics**
   - Free users who hit limits
   - Upgrade rate after hitting limits
   - Pro user satisfaction scores

3. **Cost Control**
   - Total AI API calls per month
   - Cost per user (free vs pro)
   - ROI on AI features

## Future Enhancements

Consider implementing:

1. **Grace Period**: Allow 10% overage before hard block
2. **Purchase Add-ons**: Buy additional credits without full Pro upgrade
3. **Smart Limits**: Adjust based on usage patterns
4. **Email Notifications**: Alert at 75%, 90%, and 100% usage
5. **Analytics Dashboard**: Show usage trends over time
6. **Burst Allowance**: Allow short bursts above limit
7. **Enterprise Plan**: Custom limits for large customers

## Migration Notes

- ✅ Existing Pro users now have 10k-50k limits (down from unlimited)
- ✅ Free users unchanged
- ✅ All historical usage data preserved
- ✅ No breaking changes to existing functionality
- ✅ Backwards compatible with endpoints not passing projectId

## Support

If users report issues:

1. **"I can't use AI features"**: Check their usage in `ai_usage_tracking` table
2. **"My limit seems wrong"**: Verify plan in `projects` table
3. **"Usage didn't reset"**: Check `last_reset_at` timestamp (should be <30 days)
4. **"I'm Pro but still limited"**: Verify plan column is 'pro' not 'free'

---

**Implementation Date**: 2025-10-03
**Status**: ✅ Complete
**Version**: 1.0
**Next Review**: After 30 days of usage data
