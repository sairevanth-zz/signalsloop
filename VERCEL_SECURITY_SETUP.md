# 🔒 Vercel Security Setup Guide

## 🚨 CRITICAL: Secure Your Production Environment

### Step 1: Add Environment Variables to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your SignalSloop project

2. **Navigate to Settings**
   - Click on your project
   - Go to **Settings** tab
   - Click **Environment Variables**

3. **Add Each Environment Variable**

   **Supabase Variables:**
   ```
   Name: NEXT_PUBLIC_SUPABASE_URL
   Value: https://your-project-id.supabase.co
   Environment: Production, Preview, Development

   Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: your_actual_anon_key_here
   Environment: Production, Preview, Development

   Name: SUPABASE_SERVICE_ROLE
   Value: your_actual_service_role_key_here
   Environment: Production, Preview, Development
   ```

   **Stripe Variables:**
   ```
   Name: STRIPE_PUBLISHABLE_KEY
   Value: pk_live_your_actual_publishable_key_here
   Environment: Production, Preview, Development

   Name: STRIPE_SECRET_KEY
   Value: sk_live_your_actual_secret_key_here
   Environment: Production, Preview, Development

   Name: STRIPE_WEBHOOK_SECRET
   Value: whsec_your_actual_webhook_secret_here
   Environment: Production, Preview, Development
   ```

### Step 2: Update Your Webhook Endpoint

1. **Go to Stripe Dashboard**
   - Visit [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   - Click on your webhook

2. **Update Endpoint URL**
   - Change from: `https://your-ngrok-url.ngrok.io/api/stripe/webhook`
   - Change to: `https://your-vercel-domain.vercel.app/api/stripe/webhook`

3. **Update Webhook Secret**
   - Copy the new webhook secret from Stripe
   - Update the `STRIPE_WEBHOOK_SECRET` in Vercel environment variables

### Step 3: Deploy with Secure Environment

```bash
# Deploy to production
npx vercel --prod

# Or push to main branch (if auto-deploy is enabled)
git add .
git commit -m "Secure production deployment"
git push origin main
```

### Step 4: Verify Security

1. **Check Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Verify all variables are set correctly
   - Ensure no secrets are visible in your code

2. **Test Production Payment Flow**
   - Visit your production URL
   - Test the payment flow
   - Verify webhooks are working

3. **Monitor for Issues**
   - Check Vercel function logs
   - Monitor Stripe dashboard for webhook events
   - Watch for any authentication errors

### Step 5: Security Best Practices

✅ **DO:**
- Use environment variables for all secrets
- Keep your repository public (it's safe now)
- Use different keys for development and production
- Monitor your API usage regularly
- Set up alerts for unusual activity

❌ **DON'T:**
- Never commit `.env` files
- Never put secrets in code comments
- Never share API keys in screenshots
- Never use production keys in development

### Step 6: Production Checklist

- [ ] All environment variables added to Vercel
- [ ] Webhook endpoint updated to production URL
- [ ] Stripe keys switched to live keys
- [ ] Payment flow tested in production
- [ ] Webhooks receiving events successfully
- [ ] No secrets visible in code or logs
- [ ] Repository remains public (safe)

## 🎯 Result

After completing these steps:
- ✅ Your repository is safe to be public
- ✅ All secrets are securely stored in Vercel
- ✅ Production environment is properly configured
- ✅ Payment system is ready for real customers

## 🆘 If You Need Help

If you encounter any issues:
1. Check Vercel function logs
2. Verify environment variables are set
3. Test webhook endpoints
4. Contact support if needed

---

**Remember**: Security is a continuous process. Regularly review and rotate your keys!
