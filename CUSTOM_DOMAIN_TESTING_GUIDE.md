# Custom Domain Testing Guide

This guide will help you thoroughly test the custom domain feature before launching to customers.

## 🚀 Quick Testing Setup

### 1. Database Setup
First, run the database migration:
```sql
-- Execute this in your Supabase SQL Editor
-- File: add-custom-domain-schema.sql
```

### 2. Run Automated Tests
```bash
# Test API endpoints
node test-custom-domain.js

# Or with custom parameters
PROJECT_SLUG=your-test-project TEST_DOMAIN=test.example.com node test-custom-domain.js
```

## 🧪 Comprehensive Testing Checklist

### Phase 1: Basic Functionality Testing

#### ✅ API Endpoints Testing
- [ ] **Domain Status API** (`/api/custom-domain/status`)
  - Test with valid project ID
  - Test with invalid project ID
  - Test with non-existent project ID

- [ ] **Domain Set API** (`/api/custom-domain/set`)
  - Test with valid domain format
  - Test with invalid domain format
  - Test with duplicate domain
  - Test with non-existent project

- [ ] **Domain Verification API** (`/api/custom-domain/verify`)
  - Test with valid DNS records
  - Test with invalid DNS records
  - Test with non-existent project

- [ ] **Domain Resolution API** (`/api/custom-domain/resolve`)
  - Test with custom domain
  - Test with default domain
  - Test with invalid domain

#### ✅ UI Testing
- [ ] **Settings Page Integration**
  - Navigate to Project Settings → Custom Domain tab
  - Verify Pro-only feature gating works
  - Test domain input validation
  - Test copy-to-clipboard functionality

- [ ] **Domain Setup Flow**
  - Enter valid domain name
  - Verify DNS instructions are displayed
  - Test domain verification process
  - Check status indicators

### Phase 2: DNS and Domain Testing

#### ✅ DNS Configuration Testing
1. **Set up a test domain** (use a subdomain you control):
   ```
   test-feedback.yourdomain.com
   ```

2. **Add DNS Records**:
   ```
   TXT: signalsloop-verification=your-verification-token
   CNAME: test-feedback.yourdomain.com → signalsloop.vercel.app
   ```

3. **Test DNS Propagation**:
   ```bash
   # Check TXT record
   dig TXT test-feedback.yourdomain.com
   
   # Check CNAME record
   dig CNAME test-feedback.yourdomain.com
   ```

#### ✅ Domain Verification Testing
- [ ] Test domain verification with correct DNS records
- [ ] Test domain verification with incorrect DNS records
- [ ] Test domain verification with missing DNS records
- [ ] Test domain verification after DNS changes

### Phase 3: Routing and Access Testing

#### ✅ Custom Domain Routing
- [ ] **Board Access**: `https://test-feedback.yourdomain.com`
- [ ] **Roadmap Access**: `https://test-feedback.yourdomain.com/roadmap`
- [ ] **Post Access**: `https://test-feedback.yourdomain.com/post/[id]`
- [ ] **Settings Access**: `https://test-feedback.yourdomain.com/settings`

#### ✅ Fallback Testing
- [ ] Test access with unverified domain
- [ ] Test access with non-existent domain
- [ ] Test access with expired domain
- [ ] Verify default domain still works

### Phase 4: Edge Cases and Error Handling

#### ✅ Error Scenarios
- [ ] **Invalid Domain Formats**:
  - `invalid-domain`
  - `http://domain.com`
  - `domain.com/`
  - `subdomain.domain`

- [ ] **DNS Issues**:
  - Missing TXT record
  - Wrong TXT record content
  - Missing CNAME record
  - Wrong CNAME target

- [ ] **Network Issues**:
  - DNS resolution failures
  - Timeout scenarios
  - Rate limiting

#### ✅ Security Testing
- [ ] **Domain Hijacking Prevention**:
  - Test with unauthorized domains
  - Test domain ownership verification
  - Test domain transfer scenarios

- [ ] **Access Control**:
  - Test with different user permissions
  - Test with non-Pro users
  - Test with deleted projects

### Phase 5: Performance and Load Testing

#### ✅ Performance Testing
- [ ] **DNS Resolution Speed**:
  - Measure domain resolution time
  - Test with multiple domains
  - Test with slow DNS servers

- [ ] **Page Load Times**:
  - Compare custom domain vs default domain
  - Test with different geographic locations
  - Test with various network conditions

#### ✅ Load Testing
- [ ] **Concurrent Users**:
  - Test multiple users accessing custom domains
  - Test domain verification under load
  - Test API endpoint performance

## 🔧 Testing Tools

### 1. Automated Test Script
```bash
# Run the automated test suite
node test-custom-domain.js
```

### 2. Manual Testing Checklist
```bash
# Check DNS records
dig TXT your-domain.com
dig CNAME your-domain.com

# Test domain resolution
curl -H "Host: your-domain.com" http://localhost:3000/api/custom-domain/resolve

# Test domain verification
curl -X POST http://localhost:3000/api/custom-domain/verify \
  -H "Content-Type: application/json" \
  -d '{"projectId": "your-project-id"}'
```

### 3. Browser Testing
```javascript
// Test in browser console
fetch('/api/custom-domain/status?projectId=your-project-id')
  .then(r => r.json())
  .then(console.log);
```

## 🚨 Common Issues and Solutions

### Issue 1: Domain Not Resolving
**Symptoms**: Custom domain shows "Domain Not Found" error
**Solutions**:
- Check DNS propagation (can take up to 24 hours)
- Verify CNAME record is correct
- Check domain verification status

### Issue 2: DNS Verification Fails
**Symptoms**: Domain verification always fails
**Solutions**:
- Verify TXT record format: `signalsloop-verification=token`
- Check TXT record propagation
- Ensure no extra spaces or quotes

### Issue 3: Routing Not Working
**Symptoms**: Custom domain doesn't route to correct project
**Solutions**:
- Check middleware configuration
- Verify project slug mapping
- Check domain verification status

### Issue 4: SSL Certificate Issues
**Symptoms**: HTTPS not working on custom domain
**Solutions**:
- Verify CNAME points to signalsloop.vercel.app
- Check SSL certificate status
- Wait for certificate provisioning

## 📊 Testing Metrics

Track these metrics during testing:

- **Domain Setup Success Rate**: % of domains successfully configured
- **Verification Success Rate**: % of domains successfully verified
- **DNS Propagation Time**: Average time for DNS changes to propagate
- **Page Load Time**: Performance comparison (custom vs default)
- **Error Rate**: % of requests that fail
- **User Satisfaction**: Feedback on domain setup process

## 🎯 Pre-Launch Checklist

Before launching to customers, ensure:

- [ ] All automated tests pass
- [ ] Manual testing checklist completed
- [ ] DNS propagation tested
- [ ] Error handling verified
- [ ] Performance benchmarks met
- [ ] Security testing completed
- [ ] Documentation updated
- [ ] Support team trained
- [ ] Monitoring set up
- [ ] Rollback plan prepared

## 🚀 Launch Strategy

### Soft Launch (Week 1)
- Enable for 10% of Pro users
- Monitor error rates and performance
- Collect user feedback
- Fix any critical issues

### Gradual Rollout (Week 2-3)
- Increase to 50% of Pro users
- Monitor scaling issues
- Optimize performance
- Update documentation

### Full Launch (Week 4)
- Enable for all Pro users
- Launch marketing campaign
- Monitor system performance
- Provide customer support

## 📞 Support Preparation

Prepare your support team with:

1. **Common Questions**:
   - How to set up custom domain
   - DNS configuration help
   - Troubleshooting guides
   - Verification process

2. **Escalation Procedures**:
   - When to escalate technical issues
   - How to handle domain conflicts
   - Security incident procedures

3. **Tools and Resources**:
   - DNS checking tools
   - Domain verification status
   - Customer project information
   - Troubleshooting scripts

## 🔍 Monitoring and Alerts

Set up monitoring for:

- Domain verification success rate
- DNS resolution failures
- Custom domain traffic
- Error rates by domain
- Performance metrics
- Security incidents

## 📈 Success Metrics

Track these KPIs post-launch:

- **Adoption Rate**: % of Pro users using custom domains
- **Setup Completion Rate**: % of users who complete domain setup
- **Verification Success Rate**: % of domains successfully verified
- **Customer Satisfaction**: NPS score for custom domain feature
- **Support Ticket Volume**: Related to custom domains
- **Revenue Impact**: Pro upgrades attributed to custom domains

---

## 🎉 Ready to Launch!

Once you've completed all testing phases and the pre-launch checklist, you're ready to launch the custom domain feature to your customers. Start with a soft launch to a small group of Pro users, monitor the results, and gradually roll out to all users.
