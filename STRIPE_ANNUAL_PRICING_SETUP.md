# Stripe Annual Pricing Setup Guide

This guide will walk you through setting up annual pricing in your Stripe dashboard and ensuring it's properly configured in your SignalsLoop application.

## 📋 Prerequisites

- Active Stripe account (Test and Live modes)
- Access to your Stripe Dashboard
- Admin access to your Vercel deployment
- Current Stripe integration working with monthly pricing

## 🔧 Step 1: Create Annual Pricing in Stripe Dashboard

### 1.1 Access Stripe Dashboard
1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Log in to your account
3. Make sure you're in the correct mode (Test or Live)

### 1.2 Create Annual Product (if not exists)
1. Navigate to **Products** in the left sidebar
2. Click **"Add product"** (or edit existing Pro product)
3. Fill in the product details:
   ```
   Name: Pro Plan (Annual)
   Description: Annual subscription to SignalsLoop Pro with 20% discount
   ```

### 1.3 Create Annual Price
1. In the product page, scroll to **"Pricing"** section
2. Click **"Add another price"**
3. Configure the annual price:
   ```
   Pricing model: Standard pricing
   Price: $XX.00 (your annual price - typically 10 months worth)
   Billing period: Yearly
   Currency: USD (or your preferred currency)
   ```

### 1.4 Example Annual Pricing Setup
For a $10/month Pro plan, your annual pricing should be:
```
Monthly: $10.00/month
Annual: $96.00/year (20% discount = 2 months free)
```

## 🔧 Step 2: Verify Price IDs

### 2.1 Find Your Price IDs
1. In Stripe Dashboard, go to **Products**
2. Click on your Pro product
3. Note down the Price IDs:
   ```
   Monthly Price ID: price_xxxxx (e.g., price_1234567890)
   Annual Price ID: price_yyyyy (e.g., price_0987654321)
   ```

### 2.2 Test Price Retrieval
Your application automatically fetches prices from Stripe. To verify they're working:

1. **Test API Endpoint**: Visit `/api/stripe/prices` in your browser
2. **Expected Response**: Should include both monthly and annual prices
3. **Example Response**:
   ```json
   {
     "prices": [
       {
         "id": "price_1234567890",
         "product": {
           "name": "Pro Plan",
           "description": "Monthly subscription"
         },
         "unit_amount": 1000,
         "currency": "usd",
         "recurring": {
           "interval": "month"
         }
       },
       {
         "id": "price_0987654321",
         "product": {
           "name": "Pro Plan",
           "description": "Annual subscription with 20% discount"
         },
         "unit_amount": 9600,
         "currency": "usd",
         "recurring": {
           "interval": "year"
         }
       }
     ]
   }
   ```

## 🔧 Step 3: Environment Variables

### 3.1 Required Environment Variables
Ensure these are set in your Vercel environment:

```bash
# Stripe Configuration (Required)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
```

### 3.2 How to Find These Values
1. **STRIPE_PUBLISHABLE_KEY**: 
   - Go to Stripe Dashboard → Developers → API keys
   - Copy the "Publishable key"

2. **STRIPE_SECRET_KEY**: 
   - Same location as above
   - Copy the "Secret key" (starts with `sk_test_` or `sk_live_`)

3. **STRIPE_WEBHOOK_SECRET**: 
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click on your webhook endpoint
   - Copy the "Signing secret"

### 3.3 Update Vercel Environment Variables
1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add/update the Stripe variables
5. **Redeploy** your application after adding variables

## 🔧 Step 4: Verify Application Integration

### 4.1 Check Homepage Pricing
1. Visit your homepage
2. Scroll to the pricing section
3. Toggle between Monthly/Annual
4. Verify the pricing displays correctly
5. Test both "Get Pro" buttons

### 4.2 Test Checkout Flow
1. Click "Get Pro - Annual" button
2. Should redirect to Stripe checkout
3. Verify the price shows as annual
4. Complete test purchase (use test card: `4242 4242 4242 4242`)
5. Verify success redirect works

### 4.3 Debug Annual Pricing
If annual pricing isn't working, check:

1. **Browser Console**: Look for any JavaScript errors
2. **Network Tab**: Check API calls to `/api/stripe/homepage-checkout`
3. **Server Logs**: Check Vercel function logs for errors

## 🔧 Step 5: Product Naming Convention

### 5.1 Recommended Naming
For your application to automatically detect annual pricing, use these naming conventions:

```
Product Names:
- "Pro Plan" (monthly)
- "Pro Plan" (annual) - same product, different price

OR

- "SignalsLoop Pro" (monthly)  
- "SignalsLoop Pro" (annual) - same product, different price
```

### 5.2 Price Detection Logic
Your application searches for prices with:
- `recurring.interval === 'year'` for annual
- `recurring.interval === 'month'` for monthly
- Product name containing "pro" (case insensitive)

## 🔧 Step 6: Testing Checklist

### 6.1 Stripe Dashboard Tests
- [ ] Annual product created
- [ ] Annual price configured correctly
- [ ] Both prices are active
- [ ] Price IDs noted down

### 6.2 Application Tests
- [ ] Homepage shows both monthly/annual options
- [ ] Toggle between monthly/annual works
- [ ] Annual pricing displays correctly (with 20% discount)
- [ ] "Get Pro - Annual" button works
- [ ] Stripe checkout shows correct annual price
- [ ] Test payment completes successfully
- [ ] Success redirect works

### 6.3 Environment Tests
- [ ] All Stripe environment variables set in Vercel
- [ ] Application redeployed after env changes
- [ ] `/api/stripe/prices` returns both prices
- [ ] No console errors on homepage

## 🚨 Troubleshooting

### Common Issues

**Issue**: Annual button doesn't work
**Solution**: Check that annual price exists and is active in Stripe

**Issue**: "Annual price not found" error
**Solution**: Verify product name contains "pro" and interval is "year"

**Issue**: Wrong price in checkout
**Solution**: Check price IDs and ensure they match your Stripe dashboard

**Issue**: Environment variables not working
**Solution**: Redeploy application after adding variables to Vercel

### Debug Commands

1. **Test API directly**:
   ```bash
   curl https://your-domain.com/api/stripe/prices
   ```

2. **Check environment variables**:
   ```bash
   # In Vercel function logs, check for:
   console.log('Stripe Secret Key:', process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set');
   ```

## 📞 Support

If you encounter issues:
1. Check Stripe Dashboard for price configuration
2. Verify environment variables in Vercel
3. Test the `/api/stripe/prices` endpoint
4. Check browser console and network tabs
5. Review Vercel function logs

## 🔄 Going Live

When ready for production:
1. Switch Stripe to Live mode
2. Update environment variables to live keys
3. Update webhook endpoint URL to production
4. Test with real payment methods
5. Update your pricing display to show live prices

---

**Note**: This setup ensures your annual pricing integrates seamlessly with your existing monthly pricing and maintains the 20% discount structure.
