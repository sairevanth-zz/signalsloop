# Gift Emails & Stripe Discount Setup Guide 🎁💳

## ✅ What Was Implemented

I've implemented both features you requested:

### 1. **Gift Subscription Email Notifications** 📧
- Beautiful HTML email templates
- Automatic emails when gifts are created
- Confirmation emails when gifts are claimed
- Professional branding and design

### 2. **Stripe Discount Code Integration** 💰
- Auto-sync discount codes to Stripe
- Create Stripe promotion codes automatically
- Sync toggles (active/inactive)
- Sync deletions
- Track sync status in database

---

## 🚨 Required Setup Steps

### Step 1: Get Resend API Key (for Emails)

1. **Go to** [resend.com](https://resend.com)
2. **Sign up** (free tier: 3,000 emails/month)
3. **Verify your domain** or use their test domain
4. **Get your API key** from Dashboard → API Keys
5. **Add to Vercel:**
   ```
   Name: RESEND_API_KEY
   Value: re_xxxxxxxxxxxxx
   ```

### Step 2: Update Email "From" Address

In the Resend dashboard:
1. Go to **Domains**
2. Add `signalsloop.com` as a domain
3. Add the required DNS records
4. Wait for verification (~5 minutes)

**Or** use Resend's test domain for now:
- Change `from: 'SignalsLoop <noreply@signalsloop.com>'` 
- To: `from: 'SignalsLoop <onboarding@resend.dev>'`

### Step 3: Run Database Migration

Run this SQL in Supabase:

```sql
-- File: add-stripe-coupon-tracking.sql
ALTER TABLE discount_codes 
ADD COLUMN IF NOT EXISTS stripe_coupon_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_promotion_code_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS synced_to_stripe BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_sync_error TEXT;

CREATE INDEX IF NOT EXISTS idx_discount_codes_stripe_coupon ON discount_codes(stripe_coupon_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_stripe_promo ON discount_codes(stripe_promotion_code_id);
```

### Step 4: Verify Stripe Secret Key

Make sure `STRIPE_SECRET_KEY` is set in Vercel environment variables.

---

## 📧 How Gift Emails Work

### **When You Create a Gift:**

1. Recipient receives a beautiful email with:
   - Gift amount (e.g., "3-month Pro subscription")
   - Personal message (if provided)
   - Redemption code
   - "Claim Your Pro Subscription" button
   - Expiration date warning

2. **Email Template Includes:**
   - 🎁 Eye-catching header
   - 💌 Personal message section
   - 🎯 Clear call-to-action button
   - ⏰ Expiration reminder
   - ✨ List of Pro features
   - 📧 Support contact info

### **When Gift is Claimed:**

1. Sender receives confirmation email with:
   - Recipient's name/email
   - Claim date
   - Thank you message

---

## 💰 How Stripe Discount Codes Work

### **When You Create a Discount Code:**

1. **In SignalsLoop Admin:**
   - You create code: `WELCOME20` (20% off)
   - Set usage limit, expiration, etc.

2. **Automatically in Stripe:**
   - Creates a Stripe Coupon
   - Creates a Stripe Promotion Code
   - Links them together
   - Stores Stripe IDs in database

3. **Database Stores:**
   ```
   code: "WELCOME20"
   stripe_coupon_id: "coup_xxxx"
   stripe_promotion_code_id: "promo_xxxx"
   synced_to_stripe: true
   ```

### **When User Checks Out:**

1. Stripe checkout shows promotion code field
2. User enters `WELCOME20`
3. Stripe validates and applies discount automatically
4. No custom code needed - Stripe handles everything!

### **When You Toggle/Delete:**

1. **Toggle Active/Inactive:**
   - Updates both SignalsLoop DB and Stripe
   - Stripe promotion code enabled/disabled

2. **Delete Code:**
   - Deletes from SignalsLoop DB
   - Deletes Stripe coupon (invalidates promotion code)

---

## 🎨 Email Template Preview

### Gift Notification Email:

```
┌─────────────────────────────────────┐
│  🎁 You've Got a Gift!              │
│  (Purple gradient header)           │
├─────────────────────────────────────┤
│                                     │
│  Hi John,                           │
│                                     │
│  Jane has gifted you a 3-month Pro │
│  subscription to SignalsLoop!       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ "Hope this helps you build  │   │
│  │  amazing products!" - Jane   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Your Redemption Code      │   │
│  │      GIFT-ABC123XY          │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Claim Your Pro Subscription]     │
│                                     │
│  ⏰ Expires: March 31, 2025        │
│                                     │
│  ✨ What's Included:               │
│  • Unlimited AI features           │
│  • Priority support                 │
│  • Advanced analytics              │
│  • Custom branding                 │
│                                     │
└─────────────────────────────────────┘
```

---

## 🧪 Testing

### Test Gift Emails:

1. **Go to:** Admin Panel → Gifts
2. **Create a gift:**
   - Recipient: your-test-email@gmail.com
   - Duration: 1 month
   - Message: "Test gift!"
3. **Check email** (should arrive in ~10 seconds)

### Test Discount Codes:

1. **Go to:** Admin Panel → Discount Codes
2. **Create a code:**
   - Code: `TEST50`
   - Type: Percentage
   - Value: 50
   - Usage limit: 10
3. **Check Stripe Dashboard:**
   - Go to **Products → Coupons**
   - You should see `TEST50` coupon
   - Go to **Products → Promotion Codes**
   - You should see `TEST50` promotion code
4. **Test in checkout:**
   - Start a Pro subscription
   - In Stripe checkout, enter `TEST50`
   - Should see 50% discount applied!

---

## 🔍 Troubleshooting

### **Gift Emails Not Sending:**

**Check:**
1. Is `RESEND_API_KEY` set in Vercel?
2. Is your domain verified in Resend?
3. Check Vercel logs for errors
4. Try using `onboarding@resend.dev` as "from" address

**Common Error:**
```
"Domain not found"
```
**Solution:** Use Resend's test domain or verify your domain

### **Discount Codes Not Syncing to Stripe:**

**Check:**
1. Is `STRIPE_SECRET_KEY` set in Vercel?
2. Check Vercel logs for Stripe errors
3. Look at `stripe_sync_error` column in database
4. Verify Stripe account is active

**Common Error:**
```
"Invalid API key"
```
**Solution:** Get new secret key from Stripe Dashboard

### **Discount Code Not Working in Checkout:**

**Check:**
1. Is code synced? Check `synced_to_stripe` column
2. Is code active in Stripe Dashboard?
3. Is code expired?
4. Has usage limit been reached?

---

## 📊 Database Schema

### New Columns in `discount_codes`:

```sql
stripe_coupon_id         VARCHAR(255)  -- Stripe coupon ID
stripe_promotion_code_id VARCHAR(255)  -- Stripe promo code ID
synced_to_stripe         BOOLEAN       -- Sync status
stripe_sync_error        TEXT          -- Last error (if any)
```

### Query to Check Sync Status:

```sql
SELECT 
  code, 
  synced_to_stripe, 
  stripe_coupon_id,
  stripe_sync_error
FROM discount_codes
ORDER BY created_at DESC;
```

---

## 🎯 Usage Examples

### Create a Gift (with email):

```typescript
POST /api/admin/gifts
{
  "recipient_email": "user@example.com",
  "recipient_name": "John Doe",
  "sender_name": "Jane Smith",
  "gift_message": "Enjoy your Pro subscription!",
  "duration_months": 3,
  "expires_at": "2025-12-31"
}

// Response:
{
  "gift": {...},
  "message": "Gift subscription created successfully"
}

// Email automatically sent to user@example.com
```

### Create a Discount Code (auto-synced to Stripe):

```typescript
POST /api/admin/discount-codes
{
  "code": "LAUNCH50",
  "discount_type": "percentage",
  "discount_value": 50,
  "usage_limit": 100,
  "valid_until": "2025-12-31"
}

// Response:
{
  "code": {...},
  "message": "Discount code created and synced to Stripe successfully",
  "stripeSynced": true
}

// Now usable in Stripe checkout!
```

---

## ✅ Success Checklist

After setup, verify:

- [ ] `RESEND_API_KEY` environment variable set
- [ ] Email domain verified in Resend (or using test domain)
- [ ] Database migration ran successfully
- [ ] Created a test gift - email received
- [ ] Created a test discount code
- [ ] Checked Stripe Dashboard - code appears
- [ ] Tested code in Stripe checkout - discount applies

---

## 💰 Pricing Summary

### Resend (Email Service):
- **Free tier:** 3,000 emails/month
- **Good for:** ~100 gifts/month
- **Paid:** $20/month for 50,000 emails

### Stripe Promotion Codes:
- **Free** - No additional cost
- Included in Stripe subscription

---

## 🚀 What's Next?

Your implementation is complete! Here's what you can do:

1. **Add RESEND_API_KEY** to Vercel
2. **Run the SQL migration** in Supabase
3. **Test creating a gift** → Check email
4. **Test creating a discount code** → Check Stripe
5. **Test discount in checkout** → Verify it works

---

**Status:** 🎉 Both features are fully implemented and ready to use!

**Just need:** Add the `RESEND_API_KEY` environment variable and run the SQL migration.

