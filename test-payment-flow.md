# 🧪 Payment Flow Test Checklist

## ✅ Pre-Test Setup
- [ ] Stripe test keys added to `.env.local`
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook secret added to `.env.local`
- [ ] Database schema updated with billing fields
- [ ] Dev server running (`npm run dev`)

## 🔄 Test Steps

### 1. Billing Page Test
- [ ] Navigate to `http://localhost:3000/billing`
- [ ] Verify billing dashboard loads
- [ ] Check upgrade button is visible
- [ ] Verify current plan shows "Free"

### 2. Stripe Checkout Test
- [ ] Click "Upgrade to Pro" button
- [ ] Verify redirect to Stripe checkout
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete payment process

### 3. Success Page Test
- [ ] Verify redirect to `/billing/success`
- [ ] Check success message displays
- [ ] Verify subscription details shown
- [ ] Test navigation buttons work

### 4. Database Verification
- [ ] Check `projects` table has updated billing fields
- [ ] Verify `billing_events` table has new entries
- [ ] Confirm subscription status is "active"

### 5. Feature Gating Test
- [ ] Verify Pro features are now accessible
- [ ] Check billing dashboard shows Pro plan
- [ ] Test customer portal access

## 🚨 Common Issues & Solutions

### Issue: "Missing required parameters" error
**Solution**: Check if Stripe keys are properly set in `.env.local`

### Issue: Webhook not receiving events
**Solution**: Verify webhook URL is correct and accessible

### Issue: Database not updating
**Solution**: Check webhook secret and database permissions

### Issue: Success page not loading
**Solution**: Verify session ID is being passed correctly

## 🎯 Success Criteria
- [ ] Payment completes successfully
- [ ] User redirected to success page
- [ ] Database updated with subscription info
- [ ] Pro features become accessible
- [ ] Billing dashboard reflects new plan

## 📝 Test Results
**Date**: ___________
**Tester**: ___________
**Status**: [ ] Passed [ ] Failed
**Notes**: ___________
