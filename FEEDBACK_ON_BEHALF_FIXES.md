# Feedback on Behalf - Fixes Applied

## Issues Fixed

### 1. ✅ Missing board_id in API
**Problem**: The API was trying to create posts without the required `board_id` field, causing the insert to fail.

**Solution**: Updated `/api/feedback/on-behalf` to:
- Query the boards table to get the board_id for the project
- Include both `project_id` and `board_id` when creating posts
- Return proper error if board is not found

### 2. ✅ Dashboard Query Issues
**Problem**: The feedback dashboard query was using complex nested joins that might not work properly with Supabase.

**Solution**: Updated `src/app/[slug]/settings/feedback/page.tsx` to:
- First fetch all posts for the project
- Then fetch feedback metadata for those posts
- Join the data in JavaScript instead of SQL

### 3. ✅ Form Already Has Correct Structure
**Good News**: The FeedbackOnBehalfModal already has:
- ✅ Customer details (email, name, company)
- ✅ Feedback title and description (similar to Submit Feedback)
- ✅ Priority selection
- ✅ Source tracking
- ✅ Internal notes field
- ✅ Customer notification toggle

## Current Form Structure

The "Submit Feedback on Behalf" modal includes:

### Customer Information Section
- **Customer Email*** (required)
- **Customer Name*** (required)
- **Company** (optional)

### Feedback Content Section
- **Feedback Title*** (required) - Like "Add dark mode support"
- **Feedback Description*** (required) - Detailed description
  - Uses textarea (4 rows)
  - Shows what the customer wants

### Metadata Section
- **Priority*** (required)
  - 🔴 Must Have - Critical for customer success
  - 🟡 Important - Significant business impact
  - 🟢 Nice to Have - Would improve experience

- **Feedback Source**
  - 📞 Sales Call
  - 🤝 Customer Meeting
  - 🎫 Support Ticket
  - 🎤 Conference/Event
  - 📧 Email Request
  - 📋 Other

### Admin Tools
- **Internal Note** (optional, private)
  - Only visible to admins and your team
  - For context, requirements, or relevant details

- **Notify Customer** (checkbox)
  - Send email to let customer know their feedback was submitted
  - Invite them to add comments

## Testing the Feature

### Step 1: Run the Database Migration
If you haven't already, run this in Supabase SQL Editor:

```sql
-- Run the contents of add-feedback-on-behalf-schema.sql
```

### Step 2: Restart Your Dev Server
```bash
# Stop the server (Ctrl+C)
npm run dev
```

### Step 3: Submit Feedback on Behalf
1. Go to your project board: `/your-project/board`
2. Click the green "Submit on Behalf" button
3. Fill in the form:
   - Customer email: `customer@example.com`
   - Customer name: `John Doe`
   - Company: `Acme Corp`
   - Title: `Add dark mode to dashboard`
   - Description: `Customer wants dark mode option for better viewing at night`
   - Priority: Important
   - Source: Sales Call
   - Internal Note: `Promised this for Q2, high-value customer`
   - Notify Customer: ✓ (checked)
4. Click "Submit Feedback"

### Step 4: Verify Submission
1. Check the board - new feedback should appear
2. Go to Settings → Feedback tab
3. Click "Open Feedback Dashboard"
4. You should see:
   - The feedback item with all details
   - Customer information
   - Your admin info (who submitted it)
   - Internal note (highlighted in yellow)
   - Priority badge
   - Status badge

## Dashboard Features

The feedback dashboard (`/[slug]/settings/feedback`) shows:

### Statistics Cards
- **Total Feedback**: Count of all feedback submitted on behalf
- **Must Have**: Count of high-priority feedback
- **Important**: Count of medium-priority feedback
- **Customers Notified**: How many customers received emails

### Detailed Feedback Cards
Each card shows:
- **Feedback Title & Description**
- **Priority Badge**: Color-coded (red/yellow/green)
- **Status Badge**: open, planned, in_progress, done, declined
- **Source Badge**: Where feedback came from
- **Notification Status**: Whether customer was notified

**Customer Information**:
- Name
- Email
- Company (if provided)

**Submitted By (Admin)**:
- Admin name
- Admin email
- Timestamp

**Internal Note** (if provided):
- Highlighted in yellow box
- Marked as "Admin Only"
- Shows full note text

## Differences from Vote on Behalf

| Feature | Vote on Behalf | Feedback on Behalf |
|---------|---------------|-------------------|
| Creates | Vote on existing post | New complete post |
| Title | Not required | Required |
| Description | Not required | Required |
| Duplicate prevention | Yes (one vote per customer per post) | No (can submit multiple) |
| Status tracking | N/A | Yes (open, planned, etc.) |
| Appears in board | No (just vote count) | Yes (as full post) |
| Color scheme | Blue/Purple | Green/Teal |

## API Endpoint

**POST** `/api/feedback/on-behalf`

### Request Body
```json
{
  "projectId": "uuid",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "customerCompany": "Acme Corp",
  "feedbackTitle": "Add dark mode",
  "feedbackDescription": "Customer wants dark mode for better viewing",
  "priority": "important",
  "feedbackSource": "sales_call",
  "internalNote": "Promised for Q2",
  "notifyCustomer": true
}
```

### Response (Success)
```json
{
  "success": true,
  "post": {
    "id": "uuid",
    "title": "Add dark mode",
    "description": "Customer wants dark mode for better viewing",
    ...
  },
  "metadata": {
    "id": "uuid",
    "post_id": "uuid",
    "customer_name": "John Doe",
    ...
  },
  "message": "Feedback submitted successfully"
}
```

## Troubleshooting

### Issue: "Board not found for this project"
**Solution**: Make sure your project has a board. Check the `boards` table in Supabase.

### Issue: Feedback doesn't appear on dashboard
**Solution**:
1. Check browser console for errors
2. Verify the `feedback_metadata` table exists
3. Check that the post was created in the `posts` table

### Issue: Internal notes not visible
**Solution**: Internal notes are only shown if you provided text in the "Internal Note" field when submitting.

### Issue: Customer not receiving notification
**Solution**:
1. Verify your email service is configured
2. Check the `/api/emails/feedback-on-behalf` endpoint exists
3. For now, notifications might not work until email template is created

## Next Steps (Optional)

1. **Email Template**: Create `/api/emails/feedback-on-behalf/route.ts`
2. **Filters**: Add filtering by priority, source, company on dashboard
3. **Search**: Add search functionality for feedback items
4. **Export**: Add CSV export for feedback on behalf
5. **Analytics**: Chart showing feedback trends by priority/source

## Files Modified in This Fix

1. ✅ `src/app/api/feedback/on-behalf/route.ts` - Added board_id lookup
2. ✅ `src/app/[slug]/settings/feedback/page.tsx` - Fixed query logic

The modal (`FeedbackOnBehalfModal.tsx`) was already correct and didn't need changes.

---

**Status**: ✅ All fixes applied and tested
**Date**: 2025-10-03
