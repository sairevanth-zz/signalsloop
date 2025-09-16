# 🚨 URGENT: Security Cleanup Guide

## ⚠️ CRITICAL: Your repository is public with exposed secrets!

### Immediate Actions Required:

## 1. 🔄 Rotate All Compromised Keys

### Supabase Keys:
- [ ] Go to [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Navigate to Settings → API
- [ ] **Regenerate** the anon key
- [ ] **Regenerate** the service role key
- [ ] Update `.env.local` with new keys

### Stripe Keys:
- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- [ ] **Regenerate** the secret key
- [ ] **Regenerate** the publishable key
- [ ] **Regenerate** the webhook secret
- [ ] Update `.env.local` with new keys

### Other Services:
- [ ] Check for any other API keys in your codebase
- [ ] Rotate all compromised keys

## 2. 🛡️ Secure Your Repository

### Option A: Make Repository Private (Recommended)
```bash
# On GitHub, go to Settings → General → Danger Zone
# Click "Change repository visibility" → "Make private"
```

### Option B: Clean Git History (Advanced)
```bash
# Remove sensitive files from git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local' \
  --prune-empty --tag-name-filter cat -- --all

# Force push to rewrite history
git push origin --force --all
```

## 3. 🔒 Environment Variables Best Practices

### Never commit these files:
- `.env.local`
- `.env`
- `.env.production`
- `config.json` with secrets
- Any file containing API keys

### Add to .gitignore:
```
.env*
!.env.example
config.json
secrets/
```

## 4. 🌐 Secure Production Deployment

### Vercel Environment Variables:
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all your keys there (not in code)
5. Set them for Production, Preview, and Development

### Environment Variables in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key
SUPABASE_SERVICE_ROLE=your_new_service_role_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_new_key
STRIPE_SECRET_KEY=sk_live_your_new_key
STRIPE_WEBHOOK_SECRET=whsec_your_new_webhook_secret
```

## 5. 🔍 Security Audit Checklist

- [ ] All API keys rotated
- [ ] Repository made private OR git history cleaned
- [ ] Environment variables moved to Vercel
- [ ] .env files added to .gitignore
- [ ] No secrets in code comments
- [ ] Webhook endpoints updated with new secrets
- [ ] Test all integrations with new keys

## 6. 🚀 Safe Deployment Process

1. **Development**: Use `.env.local` (not committed)
2. **Production**: Use Vercel Environment Variables
3. **Never**: Put secrets in code or public repos

## 7. 📋 Post-Security Checklist

- [ ] All services working with new keys
- [ ] Payment flow tested with new Stripe keys
- [ ] Database connections working
- [ ] Webhooks receiving events
- [ ] No errors in production logs

## ⚡ Quick Commands:

```bash
# Check what's in your git history
git log --all --full-history -- .env*

# Remove sensitive files from tracking
git rm --cached .env.local
git commit -m "Remove sensitive environment file"

# Add to .gitignore
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore
```

## 🆘 If Keys Are Already Used Maliciously:

1. **Immediately rotate all keys**
2. **Check service dashboards for suspicious activity**
3. **Review logs for unauthorized access**
4. **Consider implementing rate limiting**
5. **Monitor for unusual usage patterns**

---

**Remember**: Security is an ongoing process, not a one-time fix!
