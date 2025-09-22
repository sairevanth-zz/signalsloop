# 7-Day Free Trial Setup Guide

This guide will help you set up the 7-day free trial functionality for Pro plans in SignalsLoop.

## 🎯 Overview

The trial system allows users to:
- Start a 7-day free trial when upgrading to Pro
- Access all Pro features during the trial
- Cancel the trial at any time without being charged
- Automatically convert to paid subscription after 7 days (if not cancelled)

## 📋 Prerequisites

1. **Database Migration**: Run the trial tracking schema migration
2. **Stripe Configuration**: Ensure Stripe webhooks are configured
3. **Environment Variables**: Verify all required environment variables are set

## 🗄️ Database Setup

### Step 1: Run the Migration

Execute the following SQL script in your Supabase SQL Editor:

```sql
-- Add trial tracking fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_status VARCHAR(50) DEFAULT 'none';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;

-- Add comments for trial fields
COMMENT ON COLUMN projects.trial_start_date IS 'When the trial period started';
COMMENT ON COLUMN projects.trial_end_date IS 'When the trial period ends';
COMMENT ON COLUMN projects.trial_cancelled_at IS 'When the trial was cancelled by user';
COMMENT ON COLUMN projects.trial_status IS 'Trial status: none, active, cancelled, expired, converted';
COMMENT ON COLUMN projects.is_trial IS 'Whether the current subscription is in trial period';

-- Create index for trial lookups
CREATE INDEX IF NOT EXISTS idx_projects_trial_status ON projects(trial_status);
CREATE INDEX IF NOT EXISTS idx_projects_trial_end_date ON projects(trial_end_date) WHERE trial_end_date IS NOT NULL;

-- Update existing projects with default trial values
UPDATE projects SET
  trial_status = 'none',
  is_trial = false
WHERE trial_status IS NULL
   OR is_trial IS NULL;
```

### Step 2: Verify Migration

Check that the new columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('trial_start_date', 'trial_end_date', 'trial_status', 'is_trial', 'trial_cancelled_at');
```

## 🔧 Stripe Configuration

### Step 1: Update Webhook Events

Ensure your Stripe webhook is configured to receive these events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Step 2: Test Webhook Endpoint

Your webhook endpoint should be:
```
https://your-domain.com/api/stripe/webhook
```

## 🧪 Testing the Trial Functionality

### Step 1: Run the Test Script

```bash
node test-trial-functionality.js
```

This will test:
- Trial cancellation API
- Stripe checkout with trial
- Database schema validation

### Step 2: Manual Testing Steps

1. **Start a Trial**:
   - Go to your billing page
   - Click "Upgrade to Pro"
   - Complete the Stripe checkout
   - Verify trial status is shown in billing dashboard

2. **Test Trial Display**:
   - Check that "Pro Plan (Trial)" badge is shown
   - Verify trial end date is displayed
   - Confirm trial-specific messaging is shown

3. **Test Trial Cancellation**:
   - Click "Cancel Trial" button
   - Confirm cancellation
   - Verify project reverts to free plan

4. **Test Trial Conversion**:
   - Wait for trial to expire (or manually trigger webhook)
   - Verify subscription converts to paid
   - Check that billing starts

## 📊 Trial Status Tracking

The system tracks these trial statuses:

- **`none`**: No trial has been started
- **`active`**: Trial is currently running
- **`cancelled`**: Trial was cancelled by user
- **`expired`**: Trial expired without conversion
- **`converted`**: Trial converted to paid subscription

## 🔄 Webhook Event Handling

The system handles these trial-related events:

### `checkout.session.completed`
- Detects trial checkout sessions
- Sets trial start/end dates
- Updates trial status to 'active'

### `customer.subscription.updated`
- Handles trial-to-paid conversion
- Updates trial status to 'converted'
- Removes trial flags

### `customer.subscription.deleted`
- Handles trial cancellations
- Updates trial status to 'cancelled'
- Reverts project to free plan

## 🎨 UI Components

### Billing Dashboard Updates

The billing dashboard now shows:
- Trial badge and status
- Trial end date countdown
- Trial-specific cancellation button
- Different messaging for trial vs paid plans

### Trial-Specific Features

- **Trial Badge**: Orange "🆓 Trial" badge
- **Trial End Date**: Shows when trial expires
- **Cancel Trial Button**: Immediate cancellation option
- **Trial Messaging**: "7-Day Free Trial - All features included"

## 🚨 Troubleshooting

### Common Issues

1. **"Column does not exist" errors**:
   - Run the database migration
   - Verify all trial columns are created

2. **Trial not starting**:
   - Check Stripe webhook configuration
   - Verify checkout session metadata includes trial flag

3. **Trial cancellation not working**:
   - Check trial cancellation API endpoint
   - Verify webhook events are being received

4. **Trial conversion issues**:
   - Check Stripe subscription status
   - Verify webhook event handling

### Debug Commands

```bash
# Test trial cancellation API
curl -X POST http://localhost:3001/api/trial/cancel \
  -H "Content-Type: application/json" \
  -d '{"projectId":"your-project-id"}'

# Check project trial status
# Run in Supabase SQL Editor:
SELECT id, plan, trial_status, is_trial, trial_start_date, trial_end_date
FROM projects
WHERE id = 'your-project-id';
```

## 📈 Monitoring

### Key Metrics to Track

1. **Trial Conversion Rate**: % of trials that convert to paid
2. **Trial Cancellation Rate**: % of trials cancelled
3. **Trial Duration**: Average time before cancellation/conversion
4. **Revenue Impact**: Revenue from converted trials

### Database Queries for Analytics

```sql
-- Trial conversion rate
SELECT 
  COUNT(*) as total_trials,
  COUNT(CASE WHEN trial_status = 'converted' THEN 1 END) as conversions,
  ROUND(COUNT(CASE WHEN trial_status = 'converted' THEN 1 END) * 100.0 / COUNT(*), 2) as conversion_rate
FROM projects 
WHERE trial_status != 'none';

-- Trial cancellations by day
SELECT 
  DATE(trial_cancelled_at) as cancellation_date,
  COUNT(*) as cancellations
FROM projects 
WHERE trial_status = 'cancelled'
GROUP BY DATE(trial_cancelled_at)
ORDER BY cancellation_date DESC;
```

## ✅ Launch Checklist

Before launching the trial feature:

- [ ] Database migration completed
- [ ] Stripe webhooks configured and tested
- [ ] Trial cancellation API working
- [ ] Billing dashboard shows trial status
- [ ] Test trial start/end/cancel flows
- [ ] Verify trial conversion works
- [ ] Check error handling and edge cases
- [ ] Monitor webhook events in Stripe dashboard

## 🎉 Success!

Once all tests pass and the trial functionality is working correctly, users will be able to:

1. **Start a 7-day free trial** when upgrading to Pro
2. **Access all Pro features** during the trial period
3. **Cancel anytime** without being charged
4. **Automatically convert** to paid subscription after 7 days (if not cancelled)

The trial system provides a risk-free way for users to experience Pro features before committing to a paid subscription, potentially increasing conversion rates and user satisfaction.
