# 🗄️ SignalsLoop Backup System

## Quick Links

- 📚 [Complete Guide](./BACKUP_GUIDE.md) - Full documentation
- ⚡ [Quick Start](./BACKUP_QUICK_START.md) - 5-minute setup
- 📋 [Implementation Summary](./BACKUP_IMPLEMENTATION_SUMMARY.md) - What's included

## What Is This?

A complete, automated backup and disaster recovery system for SignalsLoop that:

✅ Backs up your entire database daily
✅ Stores backups securely in Cloudflare R2
✅ Provides admin UI for management
✅ Includes restore procedures
✅ Costs less than $1/month

## Features

- 🤖 **Automated Daily Backups** - Runs at 2 AM UTC
- ☁️ **Cloud Storage** - Cloudflare R2 (S3-compatible)
- 🎨 **Admin UI** - Manage backups from `/admin/backups`
- 📥 **Download** - Export backups as JSON
- ✅ **Verification** - Check backup integrity
- 🔄 **Restore** - Full or partial database restore
- 🧪 **Testing** - Automated test suite included
- 📊 **30-Day Retention** - Automatic cleanup

## Setup (5 Minutes)

### 1. Create Cloudflare R2 Bucket

```bash
# Go to: https://dash.cloudflare.com
# Navigate to: R2 Object Storage
# Create bucket: signalsloop-backups
# Create API Token with Edit permissions
```

### 2. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```bash
R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=signalsloop-backups
CRON_SECRET=$(openssl rand -base64 32)
```

### 3. Deploy

```bash
git add .
git commit -m "Add backup system"
git push
```

**Done!** Backups will start running automatically.

## Usage

### View Backups

Visit: `https://signalsloop.com/admin/backups`

### Create Manual Backup

**Option 1: Admin UI**
```
Go to /admin/backups → Click "Create Backup"
```

**Option 2: Command Line**
```bash
npm run backup
```

**Option 3: API**
```bash
curl -X POST https://signalsloop.com/api/admin/backups \
  -H "Authorization: Bearer YOUR_JWT"
```

### Test Backups

```bash
npm run backup:test
```

### Download Backup

1. Go to `/admin/backups`
2. Click "Download" on any backup
3. Save JSON file locally

## File Structure

```
📦 Backup System
├── 🔧 Core
│   ├── src/lib/r2-client.ts          # Cloudflare R2 client
│   └── src/lib/backup-utils.ts       # Backup/restore logic
│
├── 🤖 Automation
│   ├── scripts/daily-backup.ts       # Manual script
│   └── src/app/api/cron/daily-backup/route.ts  # Vercel cron
│
├── 🌐 API Endpoints
│   └── src/app/api/admin/backups/
│       ├── route.ts                  # List/Create
│       ├── download/route.ts         # Download
│       ├── export/route.ts           # Export tables
│       ├── verify/route.ts           # Verify integrity
│       └── restore/route.ts          # Restore database
│
├── 🎨 UI
│   └── src/app/admin/backups/page.tsx  # Admin panel
│
├── 🧪 Testing
│   └── scripts/test-backup.ts        # Test suite
│
└── 📚 Documentation
    ├── BACKUP_GUIDE.md               # Complete guide
    ├── BACKUP_QUICK_START.md         # Quick reference
    └── BACKUP_IMPLEMENTATION_SUMMARY.md  # Implementation details
```

## API Reference

### List Backups
```bash
GET /api/admin/backups
Authorization: Bearer YOUR_JWT
```

### Create Backup
```bash
POST /api/admin/backups
Authorization: Bearer YOUR_JWT
```

### Download Backup
```bash
GET /api/admin/backups/download?filename=backup_full_2025-01-22_02-00-00.json
Authorization: Bearer YOUR_JWT
```

### Verify Backup
```bash
GET /api/admin/backups/verify?filename=backup_full_2025-01-22_02-00-00.json
Authorization: Bearer YOUR_JWT
```

### Restore Backup
```bash
POST /api/admin/backups/restore
Authorization: Bearer YOUR_JWT
Content-Type: application/json

{
  "filename": "backup_full_2025-01-22_02-00-00.json",
  "dryRun": true,
  "tables": ["posts", "comments"]  // Optional: specific tables
}
```

## What Gets Backed Up?

All critical tables:
- Users & authentication
- Projects & settings
- Boards & posts
- Comments & votes
- API keys & webhooks
- Changelog & subscriptions
- Discount codes & gifts
- Security events

## Cost

**Approximately $0.50/month** for:
- 1GB database
- 30 daily backups
- Unlimited downloads (free egress!)

## Security

✅ Admin-only access
✅ JWT authentication
✅ Encrypted storage (R2)
✅ Audit logging
✅ Secure transmission (HTTPS)

## Testing

Run the comprehensive test suite:

```bash
npm run backup:test
```

Tests verify:
- ✅ Backup creation
- ✅ Upload to R2
- ✅ Download from R2
- ✅ Integrity verification
- ✅ Dry-run restore
- ✅ Cleanup procedures

## Monitoring

### Daily Checklist
- [ ] Visit `/admin/backups`
- [ ] Verify backup created today
- [ ] Check file size is reasonable

### Weekly Checklist
- [ ] Download one backup
- [ ] Verify integrity
- [ ] Check Cloudflare R2 dashboard

### Monthly Checklist
- [ ] Run test suite: `npm run backup:test`
- [ ] Test restore on staging (dry-run)
- [ ] Review backup costs

## Troubleshooting

### Backup creation fails
**Check:**
1. R2 credentials in Vercel env vars
2. R2 bucket exists and is accessible
3. Deployment logs in Vercel

### Cron not running
**Check:**
1. `vercel.json` has cron configuration
2. `CRON_SECRET` is set in Vercel
3. Wait 24 hours for first execution

### Download fails
**Check:**
1. Backup exists in R2 bucket
2. Admin authentication is valid
3. File permissions in R2

### Restore fails
**Check:**
1. Backup integrity (run verify first)
2. Database is accessible
3. Tables exist in backup file

## Support

📚 [Read the complete guide](./BACKUP_GUIDE.md)
🐛 [Report an issue](https://github.com/your-repo/issues)
💬 Contact your team lead

## License

Same as SignalLoop project.

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-10-22
