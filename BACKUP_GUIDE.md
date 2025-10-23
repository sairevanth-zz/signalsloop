# SignalsLoop Backup & Disaster Recovery Guide

## Overview

SignalsLoop has a comprehensive backup system that automatically backs up your database daily and stores backups in Cloudflare R2 (S3-compatible storage).

## Table of Contents

1. [Setup](#setup)
2. [Automated Daily Backups](#automated-daily-backups)
3. [Manual Backups](#manual-backups)
4. [Restore Procedures](#restore-procedures)
5. [Testing Backups](#testing-backups)
6. [Troubleshooting](#troubleshooting)

## Setup

### 1. Create Cloudflare R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **R2 Object Storage**
3. Click **Create bucket**
4. Name it: `signalsloop-backups` (or any name you prefer)
5. Create the bucket

### 2. Generate R2 API Credentials

1. In Cloudflare R2, go to **Manage R2 API Tokens**
2. Click **Create API Token**
3. Give it **Edit** permissions
4. Copy the credentials:
   - Access Key ID
   - Secret Access Key
   - Account ID (from the R2 URL)

### 3. Configure Environment Variables

Add these to your `.env` (local) and Vercel (production):

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=signalsloop-backups

# Cron Secret (for Vercel Cron)
CRON_SECRET=your_random_secret_here
```

Generate a random secret for `CRON_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Configure Vercel Cron (Automated Daily Backups)

Create or update `vercel.json` in your project root:

```json
{
  "crons": [{
    "path": "/api/cron/daily-backup",
    "schedule": "0 2 * * *"
  }]
}
```

This runs the backup daily at 2:00 AM UTC.

### 5. Deploy to Vercel

```bash
git add .
git commit -m "Add backup system"
git push
```

Vercel will automatically set up the cron job.

## Automated Daily Backups

### How It Works

1. **Cron triggers** at 2:00 AM UTC daily
2. **Backup is created** containing all tables
3. **Uploaded to R2** with timestamp in filename
4. **Old backups cleaned up** (keeps last 30 backups)

### What's Backed Up

All tables in your database:
- `users`
- `projects`
- `boards`
- `posts`
- `comments`
- `votes`
- `api_keys`
- `webhooks`
- `webhook_deliveries`
- `changelog_releases`
- `changelog_subscribers`
- `discount_codes`
- `gift_subscriptions`
- `security_events`

### Backup Format

Backups are stored as JSON files:

```
backups/backup_full_2025-01-22_02-00-00.json
```

Each backup contains:
- **Metadata**: timestamp, version, table list, record count, size
- **Data**: Complete data for all tables

### Manual Trigger via Script

You can manually run the backup script:

```bash
tsx scripts/daily-backup.ts
```

## Manual Backups

### Via Admin Panel

1. Go to `/admin/backups`
2. Click **Create Backup**
3. Backup will be created and uploaded to R2

### Via API

```bash
curl -X POST https://signalsloop.com/api/admin/backups \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT"
```

### Via Cron Endpoint

```bash
curl -X GET https://signalsloop.com/api/cron/daily-backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Restore Procedures

⚠️ **WARNING**: Restoring a backup will **overwrite** your current database. Always test restores on a staging environment first!

### Option 1: Via API (Recommended)

#### Step 1: List available backups
```bash
curl https://signalsloop.com/api/admin/backups \
  -H "Authorization: Bearer YOUR_JWT"
```

#### Step 2: Verify backup integrity
```bash
curl "https://signalsloop.com/api/admin/backups/verify?filename=backup_full_2025-01-22_02-00-00.json" \
  -H "Authorization: Bearer YOUR_JWT"
```

#### Step 3: Dry run (test without actually restoring)
```bash
curl -X POST https://signalsloop.com/api/admin/backups/restore \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "backup_full_2025-01-22_02-00-00.json",
    "dryRun": true
  }'
```

#### Step 4: Actual restore
```bash
curl -X POST https://signalsloop.com/api/admin/backups/restore \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "backup_full_2025-01-22_02-00-00.json",
    "dryRun": false
  }'
```

#### Restore specific tables only:
```bash
curl -X POST https://signalsloop.com/api/admin/backups/restore \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "backup_full_2025-01-22_02-00-00.json",
    "dryRun": false,
    "tables": ["posts", "comments"]
  }'
```

### Option 2: Via Admin Panel

1. Go to `/admin/backups`
2. Find the backup you want to restore
3. Click **Verify** to check integrity
4. Click **Download** to download locally
5. Use API or script to restore

### Option 3: Manual Restore via Script

Coming soon - manual restore script

## Testing Backups

### Test Script

```bash
tsx scripts/test-backup.ts
```

This script will:
1. Create a test backup
2. Verify backup integrity
3. Perform a dry-run restore
4. Report results

### Test Checklist

- [ ] Backup creation succeeds
- [ ] Backup is uploaded to R2
- [ ] Backup can be downloaded
- [ ] Backup integrity verification passes
- [ ] Dry-run restore succeeds
- [ ] Actual restore succeeds (on staging!)
- [ ] Restored data matches original

### Monthly Testing Recommendation

1. **Week 1**: Verify automated backups are running
2. **Week 2**: Download and inspect a backup file
3. **Week 3**: Test restore on staging environment
4. **Week 4**: Document any issues found

## Backup Monitoring

### Check Backup Status

```bash
# List all backups
curl https://signalsloop.com/api/admin/backups \
  -H "Authorization: Bearer YOUR_JWT"

# Check latest backup
curl https://signalsloop.com/api/admin/backups \
  -H "Authorization: Bearer YOUR_JWT" | jq '.backups[0]'
```

### Alert on Missing Backups

Set up monitoring to alert if:
- No backup created in last 36 hours
- Backup size is significantly smaller than average
- Backup verification fails

## Export Specific Data

### Export Specific Tables

```bash
curl -X POST https://signalsloop.com/api/admin/backups/export \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "tables": ["posts", "comments", "users"]
  }' \
  --output export_data.json
```

## Disaster Recovery Scenarios

### Scenario 1: Accidental Data Deletion

1. Identify when data was deleted
2. Find most recent backup before deletion
3. Restore specific tables affected
4. Verify data is restored correctly

### Scenario 2: Database Corruption

1. Create immediate backup (if possible)
2. Find most recent valid backup
3. Test restore on staging
4. Restore to production
5. Verify all services are working

### Scenario 3: Complete Data Loss

1. Find most recent backup
2. Verify backup integrity
3. Restore full backup
4. Verify all data
5. Run data validation scripts
6. Resume operations

## Backup Retention Policy

- **Daily backups**: Keep last 30 days
- **Weekly backups**: Keep last 12 weeks (implement custom retention)
- **Monthly backups**: Keep last 12 months (implement custom retention)

To implement custom retention, modify `cleanupOldBackups()` in `src/lib/backup-utils.ts`.

## Security Best Practices

1. **Encrypt backups**: R2 encrypts data at rest automatically
2. **Access control**: Only admins can access backup endpoints
3. **API tokens**: Use short-lived JWT tokens for API access
4. **Audit logs**: All backup operations are logged in security_events
5. **Test restores**: Regularly test backup restoration procedures

## Costs

### Cloudflare R2 Pricing (as of 2024)

- **Storage**: $0.015 per GB/month
- **Class A operations** (write): $4.50 per million
- **Class B operations** (read): $0.36 per million
- **Egress**: Free (unlike S3!)

### Estimated Costs

For a database of 1GB:
- **Storage**: ~$0.45/month (30 backups × 1GB × $0.015)
- **Operations**: Negligible
- **Total**: < $1/month

## Troubleshooting

### Backup creation fails

```
Error: Missing R2 credentials
```

**Solution**: Check environment variables are set correctly in Vercel.

### Backup upload fails

```
Error: Access Denied
```

**Solution**: Verify R2 API token has Edit permissions.

### Restore fails

```
Error: Invalid backup format
```

**Solution**: Run verify endpoint to check backup integrity.

### Cron job not running

1. Check `vercel.json` is committed
2. Verify `CRON_SECRET` is set in Vercel
3. Check Vercel deployment logs
4. Wait 24h for first cron execution

## Support

For backup-related issues:
1. Check logs in Vercel Dashboard
2. Verify R2 bucket exists and is accessible
3. Test credentials with R2 dashboard
4. Review security_events table for errors

## Advanced: Custom Backup Schedule

To change backup frequency, update `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/daily-backup",
    "schedule": "0 */6 * * *"  // Every 6 hours
  }]
}
```

Cron format: `minute hour day month dayOfWeek`

Examples:
- Every 6 hours: `0 */6 * * *`
- Twice daily: `0 2,14 * * *` (2 AM and 2 PM)
- Every hour: `0 * * * *`

## Compliance

Backups help meet compliance requirements:
- **GDPR**: Ability to restore deleted user data
- **SOC 2**: Disaster recovery procedures
- **HIPAA**: Data backup and recovery (if applicable)

Always consult with compliance experts for your specific requirements.
