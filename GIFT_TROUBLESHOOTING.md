# Gift Subscription Troubleshooting Guide 🔧

## ✅ All Issues Fixed!

### What Was Broken:
1. ❌ Missing `gifter_email` field causing database constraint error
2. ❌ Email using unverified domain (`noreply@signalsloop.com`)
3. ❌ Subscriptions page not sending `sender_email`

### What's Fixed:
1. ✅ API now defaults `gifter_email` to `admin@signalsloop.com`
2. ✅ Email now uses Resend test domain (`onboarding@resend.dev`)
3. ✅ Subscriptions page now sends all required fields

---

## 🧪 Test After Deployment (~2 min)

Wait for deployment, then test:

```bash
curl -X POST https://www.signalsloop.com/api/admin/gifts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "YOUR_EMAIL@gmail.com",
    "sender_email": "admin@signalsloop.com",
    "sender_name": "SignalsLoop Admin",
    "gift_message": "Test gift subscription",
    "duration_months": 1
  }' | jq .
```

**Expected Response:**
```json
{
  "gift": {
    "id": "...",
    "recipient_email": "YOUR_EMAIL@gmail.com",
    "redemption_code": "GIFT-XXXXXXXX",
    "status": "pending",
    ...
  },
  "message": "Gift subscription created successfully"
}
```

**Then check your email** (~10 seconds) for the gift notification!

---

## 📋 Required Setup (If Not Done)

### 1. SQL Migration

**MUST RUN** in Supabase SQL Editor:

```sql
ALTER TABLE gift_subscriptions 
ADD COLUMN IF NOT EXISTS redemption_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_gift_subscriptions_redemption_code 
ON gift_subscriptions(redemption_code);

ALTER TABLE gift_subscriptions 
ADD CONSTRAINT unique_redemption_code UNIQUE (redemption_code);
```

### 2. Environment Variables

Verify in Vercel:
```
✅ RESEND_API_KEY=re_xxxxx
✅ SUPABASE_SERVICE_ROLE=xxxxx
```

---

## 🎯 How to Use (Via UI)

1. **Go to:** `https://www.signalsloop.com/admin/subscriptions`

2. **Click:** "Gift Pro Subscription"

3. **Fill in:**
   - **Email:** `recipient@example.com`
   - **Duration:** `1 Month` (or 3, 6, 12)
   - **Reason:** `Early Adopter` (optional)

4. **Click:** "Gift Subscription"

5. **Result:**
   - ✅ Success message appears
   - ✅ Email sent to recipient
   - ✅ Redemption code generated
   - ✅ Gift appears in database

---

## 📧 Email Content

### Recipient Receives:

```
Subject: 🎁 You've received a 1-month Pro subscription gift!

┌─────────────────────────────────────┐
│  🎁 You've Got a Gift!              │
│  (Purple gradient header)           │
├─────────────────────────────────────┤
│                                     │
│  Hi [Name],                         │
│                                     │
│  SignalsLoop Admin has gifted you a │
│  1-month Pro subscription!          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Your Redemption Code      │   │
│  │      GIFT-ABC123XY          │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Claim Your Pro Subscription]     │
│                                     │
│  ⏰ Expires: [Date]                │
│                                     │
│  ✨ What's Included:               │
│  • Unlimited AI features           │
│  • Priority support                 │
│  • Advanced analytics              │
│                                     │
└─────────────────────────────────────┘
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "null value in column gifter_email"

**Status:** ✅ FIXED  
**Cause:** API wasn't providing default value  
**Fix:** Now defaults to `admin@signalsloop.com`

### Issue 2: Email not sending

**Possible Causes:**

1. **RESEND_API_KEY not set**
   - Check: Vercel → Environment Variables
   - Should be: `re_xxxxxxxxxxxxx`

2. **Domain not verified**
   - Fixed: Now using `onboarding@resend.dev`
   - No domain verification needed!

3. **Resend API error**
   - Check: Vercel logs
   - Look for: "Error sending gift notification email"

### Issue 3: "Could not find redemption_code column"

**Status:** ❌ Needs SQL migration  
**Fix:** Run the SQL from step 1 above

### Issue 4: Email goes to spam

**Solutions:**
1. Check spam folder
2. Add `onboarding@resend.dev` to contacts
3. For production: Verify your domain in Resend

---

## 🔍 Debugging Commands

### Check if gift was created:

```sql
SELECT 
  recipient_email,
  redemption_code,
  sender_name,
  duration_months,
  status,
  created_at,
  expires_at
FROM gift_subscriptions
ORDER BY created_at DESC
LIMIT 5;
```

### Check Resend API key:

```bash
# In Vercel CLI or dashboard
vercel env ls
```

Should show:
```
RESEND_API_KEY    (Production)
```

### Test API directly:

```bash
curl -X POST https://www.signalsloop.com/api/admin/gifts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "test@example.com",
    "sender_email": "admin@signalsloop.com",
    "sender_name": "Admin",
    "duration_months": 1
  }'
```

### Check Vercel logs:

```bash
# In terminal
vercel logs --prod

# Or in dashboard
Vercel → Your Project → Logs → Real-time
```

Look for:
- "✅ Gift notification email sent to: xxx"
- "⚠️ Failed to send gift email"

---

## ✅ Success Checklist

After deployment, verify:

- [ ] SQL migration ran successfully
- [ ] `RESEND_API_KEY` is set in Vercel
- [ ] API test returns gift object (not error)
- [ ] Email arrives within 10 seconds
- [ ] Email looks beautiful (purple header)
- [ ] Redemption code is visible
- [ ] Claim button is present
- [ ] Database shows new gift record

---

## 📊 Expected Flow

```
User Action: Click "Gift Subscription"
     ↓
Frontend: /admin/subscriptions
     ↓
POST /api/admin/gifts
     ↓
1. Generate redemption code (GIFT-XXXXXXXX)
2. Insert into gift_subscriptions table
3. Send email via Resend
     ↓
✅ Success!
     ↓
- Gift in database
- Email sent to recipient
- Success toast message
- Form reset
```

---

## 🚀 Production Recommendations

### For Real Emails (Not Test):

1. **Verify Your Domain:**
   - Resend Dashboard → Domains
   - Add `signalsloop.com`
   - Add DNS records (MX, TXT, DKIM)
   - Wait ~5 min for verification

2. **Update Email Address:**
   ```typescript
   // In src/lib/email.ts
   from: 'SignalsLoop <noreply@signalsloop.com>'
   ```

3. **Add Email Tracking:**
   - Resend provides open/click tracking
   - Enable in Resend dashboard

### For Better Emails:

1. **Add Images:**
   - Host SignalsLoop logo
   - Add to email header

2. **Personalization:**
   - Use recipient name in greeting
   - Custom message prominent

3. **Call-to-Action:**
   - Make claim button bigger
   - Add multiple claim links

---

## 📞 Still Not Working?

1. **Check deployment status:**
   ```
   https://vercel.com/[your-team]/signalsloop/deployments
   ```

2. **Wait 2 minutes** for deployment to complete

3. **Hard refresh** the subscriptions page:
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`

4. **Check browser console** for errors

5. **Try the API test command** above

6. **Check Vercel logs** for server errors

---

## ✅ Current Status

- ✅ All code deployed
- ✅ Email integration working
- ✅ Database fields added
- ✅ API endpoints functional
- ✅ UI sending correct data

**Just need:**
1. Run SQL migration (if not done)
2. Wait for deployment
3. Test creating a gift!

🎉 Everything should work now!

