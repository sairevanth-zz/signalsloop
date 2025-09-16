# Stripe Integration Test Guide

## 🎯 Complete Stripe Payment Flow Testing

### Prerequisites
Before testing, ensure you have:

1. **Stripe Test Keys** (if not provided, I can help you get them):
   - `STRIPE_PUBLISHABLE_KEY` (test)
   - `STRIPE_SECRET_KEY` (test)
   - `STRIPE_WEBHOOK_SECRET` (test)

2. **Database Schema Updated**:
   - Run `stripe-billing-schema-update.sql` in your Supabase SQL Editor
   - Or use the updated `supabase-setup.sql` for new installations

### 🔧 Setup Steps

1. **Configure Stripe Settings**:
   - Go to your project settings: `/[project-slug]/settings`
   - Navigate to "Stripe Settings" tab
   - Add your test Stripe keys:
     - Publishable Key: `pk_test_...`
     - Secret Key: `sk_test_...`
     - Webhook Secret: `whsec_...`
     - Price ID: `price_...` (your $19/month price ID)
   - Save settings

2. **Configure Webhook Endpoint**:
   - In Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

### 🧪 Test Scenarios

#### Test 1: Free to Pro Upgrade Flow
1. **Start**: Create a project (automatically Free plan)
2. **Navigate**: Go to `/[project-slug]/billing`
3. **Upgrade**: Click "Upgrade to Pro" button
4. **Checkout**: Complete Stripe checkout with test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
5. **Success**: Should redirect to `/billing/success`
6. **Verify**: Check project is now Pro plan

#### Test 2: Feature Gating
1. **Free Features**: Verify free features work (1 board, basic features)
2. **Pro Features**: After upgrade, verify Pro features unlock:
   - Unlimited boards
   - Private boards
   - Custom domain settings
   - API access
   - Remove branding options

#### Test 3: Billing Management
1. **Portal Access**: Click "Manage Billing" in billing dashboard
2. **Stripe Portal**: Should open Stripe Customer Portal
3. **Actions**: Test subscription management:
   - Update payment method
   - Download invoices
   - Cancel subscription (if desired)

#### Test 4: Webhook Events
1. **Payment Success**: Complete a test payment
2. **Database Check**: Verify billing_events table has new entries
3. **Subscription Update**: Check projects table has correct status
4. **Cancellation**: Test subscription cancellation (if needed)

### 🔍 Verification Points

#### Database Verification
Check these tables after each test:

```sql
-- Check project status
SELECT plan, subscription_status, current_period_end, stripe_customer_id 
FROM projects WHERE slug = 'your-project-slug';

-- Check billing events
SELECT event_type, created_at, metadata 
FROM billing_events 
WHERE stripe_customer_id = 'cus_...' 
ORDER BY created_at DESC;

-- Check Stripe settings
SELECT configured, payment_method, stripe_price_id 
FROM stripe_settings 
WHERE project_id = 'your-project-id';
```

#### UI Verification
1. **Dashboard**: Pro badge should appear
2. **Billing Page**: Shows Pro plan status
3. **Settings**: Pro features should be unlocked
4. **Feature Gates**: Pro-only features should be accessible

### 🚨 Common Issues & Solutions

#### Issue 1: "Stripe is not configured"
**Solution**: Ensure Stripe keys are saved in project settings

#### Issue 2: Webhook signature verification failed
**Solution**: Check webhook secret matches Stripe dashboard

#### Issue 3: Subscription not updating after payment
**Solution**: Check webhook endpoint is accessible and events are firing

#### Issue 4: Feature gates not working
**Solution**: Verify project plan is updated in database

### 📋 Test Checklist

- [ ] Stripe keys configured in settings
- [ ] Webhook endpoint configured in Stripe
- [ ] Test payment flow works
- [ ] Success page displays correctly
- [ ] Project upgrades to Pro plan
- [ ] Pro features become accessible
- [ ] Billing portal opens correctly
- [ ] Database events are logged
- [ ] Feature gates work properly
- [ ] Subscription management works

### 🎉 Success Criteria

Your Stripe integration is working correctly when:

1. ✅ Users can upgrade from Free to Pro ($19/month)
2. ✅ Payment success redirects to beautiful success page
3. ✅ Pro features unlock immediately after payment
4. ✅ Billing management portal works
5. ✅ All Stripe events are properly logged
6. ✅ Feature gating system respects plan limits
7. ✅ Subscription status updates in real-time

### 🔑 Keys Needed

If you need help getting Stripe test keys, I can guide you through:
1. Creating a Stripe account
2. Getting test API keys
3. Creating a $19/month price
4. Setting up webhook endpoints

Just let me know what keys you need help with!
