# PostHog Analytics - Tracking Guide

## ✅ Setup Complete

PostHog is now enabled and will automatically track:
- **Page views** - every page visit
- **User sessions** - time spent, pages per session
- **User properties** - browser, device, location

---

## Pre-Built Events Ready to Use

You already have 15+ analytics events set up in `src/lib/analytics.tsx`:

### **User Lifecycle**
```typescript
import { analytics } from '@/lib/analytics';

// When user signs up
analytics.signup({ source: 'homepage' });

// When user creates first project
analytics.createProject(projectId, { plan: 'free' });

// Identify user for tracking across sessions
analytics.identify(userId, { email, name, plan });
```

### **Engagement Events**
```typescript
// Post interactions
analytics.submitPost(postId, projectId, 'web', { category: 'feature' });
analytics.vote(postId, projectId, { from: 'board' });
analytics.addComment(postId, commentId);

// Board views
analytics.viewBoard(projectSlug, boardId);
```

### **Admin Events**
```typescript
// When admin changes post status
analytics.statusChange(postId, 'open', 'in-progress');

// When admin moderates
analytics.postModerated(postId, 'approved');
```

### **Business Events**
```typescript
// Checkout flow
analytics.startCheckout(projectId, 'pro', { interval: 'annual' });
analytics.purchase(projectId, 'pro', 29.99);

// Custom domain
analytics.domainAdded(projectId, 'feedback.example.com');
```

### **Widget Events**
```typescript
// Widget interactions
analytics.widgetOpen(projectId, domain);
analytics.widgetSubmit(postId, projectId, domain);
```

---

## Key Metrics to Track for Launch

### **1. Activation Rate**
Track how many signups → create first project:

```typescript
// In signup flow
analytics.signup({ source: 'landing', cta: 'hero' });

// In project creation
analytics.createProject(projectId, {
  is_first_project: true,
  time_since_signup_minutes: 5
});
```

**Dashboard:** Create funnel: `signup` → `create_project`

### **2. Engagement Rate**
Track active users submitting/voting:

```typescript
// Already implemented in your code
analytics.submitPost(postId, projectId, 'web');
analytics.vote(postId, projectId);
```

**Dashboard:** Track daily active users with `submit_post` or `vote` events

### **3. Retention**
PostHog automatically tracks this - no code needed.

**Dashboard:** Insights → Retention

### **4. Revenue Tracking**
```typescript
// When checkout starts
analytics.startCheckout(projectId, 'pro', {
  interval: 'annual',
  discount_code: 'LAUNCH50'
});

// After Stripe webhook confirms
analytics.purchase(projectId, 'pro', 348.00, {
  interval: 'annual',
  stripe_customer_id: customerId
});
```

**Dashboard:** Create funnel: `start_checkout` → `purchase`

---

## How to Add Tracking to Existing Pages

### **Example: Track button clicks**

```typescript
// In any component
import { analytics } from '@/lib/analytics';

function MyComponent() {
  const handleCTAClick = () => {
    analytics.page('clicked_cta', {
      button_text: 'Get Started',
      location: 'hero'
    });
    router.push('/signup');
  };

  return <button onClick={handleCTAClick}>Get Started</button>;
}
```

### **Example: Track page views**

```typescript
// Use the hook in any component
import { useAnalytics } from '@/lib/analytics';

function MyPage() {
  const analytics = useAnalytics(); // Auto-tracks page view

  return <div>Page content</div>;
}
```

---

## Where to Add Analytics (Post-Launch)

### **High Priority**
1. **Signup completion** → `analytics.signup()`
2. **Project creation** → `analytics.createProject()`
3. **First post submission** → Already tracked ✅
4. **Upgrade to Pro** → `analytics.purchase()`

### **Medium Priority**
5. **Widget installation** → `analytics.widgetOpen()`
6. **Custom domain added** → `analytics.domainAdded()`
7. **Data import** → `analytics.dataImported()`
8. **Homepage CTA clicks**

### **Low Priority (Nice to have)**
9. Documentation views
10. Settings changes
11. Team invites
12. Integration connections

---

## PostHog Dashboard Setup

After launch, create these views:

### **1. Conversion Funnel**
```
Homepage View → Signup → Create Project → Submit First Post
```

### **2. Daily Active Users**
Track users who perform any of:
- `submit_post`
- `vote`
- `add_comment`
- `view_board`

### **3. Revenue Dashboard**
- `start_checkout` count
- `purchase` count
- Conversion rate
- Revenue (sum of `purchase.amount`)

### **4. Feature Usage**
- Widget opens
- Vote-on-behalf usage
- Custom domain adds
- Data imports

---

## Example: Track Homepage CTA Performance

```typescript
// src/app/page.tsx
import { analytics } from '@/lib/analytics';

export default function Homepage() {
  const handleHeroCTA = () => {
    analytics.page('cta_clicked', {
      section: 'hero',
      text: 'Start Collecting Feedback',
      timestamp: new Date().toISOString()
    });
    router.push('/signup');
  };

  const handlePricingCTA = (plan: string) => {
    analytics.page('cta_clicked', {
      section: 'pricing',
      plan: plan,
      text: `Get ${plan}`,
    });
    router.push(`/signup?plan=${plan}`);
  };

  return (
    <>
      <button onClick={handleHeroCTA}>Start Collecting Feedback</button>
      <button onClick={() => handlePricingCTA('pro')}>Get Pro</button>
    </>
  );
}
```

---

## Testing Your Analytics

### **1. Enable Debug Mode**
Already configured - PostHog debug logs in development mode.

Check browser console for:
```
[PostHog] Tracking event: signup
```

### **2. Test in Production**
After deploying, visit your site and check PostHog dashboard:
- Go to https://app.posthog.com
- Navigate to **Live Events** (bottom left)
- Perform actions on your site
- See events appear in real-time

### **3. Verify User Identification**
```typescript
// After user logs in
analytics.identify(user.id, {
  email: user.email,
  name: user.name,
  plan: user.plan,
  created_at: user.created_at
});
```

Check PostHog → Persons to see user properties.

---

## Privacy & GDPR Compliance

Your current config respects user privacy:

```typescript
// From src/lib/analytics.tsx
posthog.init(key, {
  respect_dnt: true,  // ✅ Respects Do Not Track
  capture_pageview: true,
  // PostHog EU hosting available if needed
});
```

**For GDPR:**
1. Add cookie consent banner (recommended: https://cookieconsent.orestbida.com/)
2. Only initialize PostHog after consent:

```typescript
// Conditional initialization
if (userConsent === 'granted') {
  initializePostHog();
}
```

---

## Cost Estimation

PostHog Free tier includes:
- **1 million events/month** (free forever)
- **Unlimited team members**
- All features unlocked

**Your expected usage:**
- 5,000-10,000 MAU = ~100,000-300,000 events/month
- Well within free tier ✅

---

## Quick Wins for Launch Week

### **Day 1: Track Core Conversions**
```typescript
// Add to signup flow
analytics.signup({ source: utm_source });

// Add to project creation
analytics.createProject(projectId);
```

### **Day 2: Track Revenue**
```typescript
// Add to Stripe webhook handler
analytics.purchase(projectId, plan, amount);
```

### **Day 3: Homepage CTA Tracking**
Track all "Get Started" / "Sign Up" clicks with location context.

### **Day 4: Create Dashboards**
- Signup funnel
- Daily active users
- Revenue tracking

---

## What's Already Tracked (No Code Needed)

✅ **Automatic Tracking:**
- All page views
- Session duration
- Bounce rate
- User location (country/city)
- Device & browser info
- Referrer sources

✅ **Pre-Built Events (just call them):**
- 15+ events ready in `src/lib/analytics.tsx`
- Type-safe TypeScript functions
- Consistent timestamp formatting

---

## Next Steps

1. **Deploy** (PostHog now enabled)
2. **Verify** tracking in PostHog dashboard after launch
3. **Add** custom events for key actions (signup, purchase, etc.)
4. **Create** dashboards for monitoring

**PostHog Dashboard:** https://app.posthog.com
**Docs:** https://posthog.com/docs

You're all set! 🚀
