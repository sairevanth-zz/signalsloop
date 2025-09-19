# Gift Subscription Setup Guide

## 🎁 Setting Up Pro Subscription Gifting

The gift subscription feature allows you to send Pro subscriptions to users as gifts. Here's how to set it up:

### 1. Database Setup (Required)

The gift subscription system requires specific database functions that need to be created first.

**Run this SQL in your Supabase SQL Editor:**

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `add-gift-subscriptions-schema.sql`
4. Click **Run**

This will create:
- `gift_subscriptions` table
- `create_gift_subscription()` function
- `claim_gift_subscription()` function  
- `get_gift_stats()` function
- Proper RLS policies

### 2. Test the Setup

Run this command to verify the database functions exist:

```bash
node test-gift-database.js
```

You should see:
```
✅ gift_subscriptions table exists
✅ create_gift_subscription function exists
✅ claim_gift_subscription function exists
✅ get_gift_stats function exists
```

### 3. How to Use Gift Subscriptions

#### For Project Owners:

1. **Create a Gift:**
   - Go to your project settings
   - Navigate to "Gift Subscriptions" section
   - Click "Gift Pro Subscription"
   - Enter recipient email and duration
   - Add optional personal message
   - Click "Send Gift"

2. **Bulk Gifting:**
   - Use the bulk gift feature to send multiple gifts at once
   - Enter one email per line in the textarea
   - All gifts will be created with the same duration and message

#### For Recipients:

1. **Receive Gift:**
   - Recipients receive an email with a gift link
   - The link format is: `https://yourdomain.com/gift/[gift-id]`

2. **Claim Gift:**
   - Click the gift link
   - Sign in or create an account
   - Click "Claim Your Pro Subscription"
   - The Pro plan is automatically applied to the project

### 4. Gift Subscription Features

- **Flexible Duration:** 1 month to 2 years
- **Personal Messages:** Add custom messages to gifts
- **Expiration:** Gifts expire after 30 days if not claimed
- **Status Tracking:** Track pending, claimed, and expired gifts
- **Bulk Operations:** Send multiple gifts at once
- **Analytics:** View gift statistics and history

### 5. Troubleshooting

#### "Authentication required" Error
- Make sure you're signed in to your account
- The gift creation requires a valid user session

#### "Database function not found" Error
- Run the `add-gift-subscriptions-schema.sql` file in Supabase
- Verify all functions exist by running `node test-gift-database.js`

#### "Gift not found" Error
- The gift ID might be invalid
- The gift might have expired (30-day limit)
- The gift might have already been claimed

### 6. Email Notifications (Optional)

The system includes placeholder functions for email notifications. To enable actual email sending:

1. Set up your email service (Resend, SendGrid, etc.)
2. Update the `send_gift_notification()` function in the database
3. Configure email templates for gift notifications

### 7. Security Features

- **Row Level Security (RLS):** Ensures users can only access their own gifts
- **Authentication Required:** All gift operations require valid user sessions
- **Project Ownership:** Only project owners can create gifts for their projects
- **Expiration Handling:** Automatic cleanup of expired gifts

## 🚀 Ready to Use!

Once the database setup is complete, the gift subscription feature will be fully functional. Users can start sending Pro subscriptions as gifts immediately!
