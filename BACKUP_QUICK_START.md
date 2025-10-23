# Backup System - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Create Cloudflare R2 Bucket

1. Go to [Cloudflare R2](https://dash.cloudflare.com)
2. Create bucket: `signalsloop-backups`
3. Create API Token with Edit permissions
4. Copy: Account ID, Access Key ID, Secret Access Key

### 2. Add Environment Variables

Add to Vercel Environment Variables:

```bash
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=signalsloop-backups
CRON_SECRET=$(openssl rand -base64 32)
```

### 3. Deploy

```bash
git add .
git commit -m "Add backup system"
git push
```

Done! Backups will run automatically every day at 2 AM UTC.

## 🎯 Quick Usage

### Create Manual Backup

**Via Admin Panel:**
1. Go to `/admin/backups`
2. Click "Create Backup"

**Via CLI:**
```bash
tsx scripts/daily-backup.ts
```

### View Backups

Go to `/admin/backups` in your browser

### Download Backup

1. Go to `/admin/backups`
2. Click "Download" on any backup

### Test Backups

```bash
tsx scripts/test-backup.ts
```

## 📋 Daily Checklist

- [ ] Check `/admin/backups` - verify last backup was created
- [ ] Check backup file size - should be consistent
- [ ] Download one backup per week and verify

## 🚨 Disaster Recovery

### If you need to restore:

1. **Verify backup:**
   - Go to `/admin/backups`
   - Click "Verify" on the backup

2. **Download backup:**
   - Click "Download" to save locally

3. **Contact support or:**
   - Use API to restore (see `BACKUP_GUIDE.md`)
   - Always test on staging first!

## 📚 Full Documentation

- **Complete Guide**: `BACKUP_GUIDE.md`
- **API Reference**: See admin endpoints in code

## ✅ Verification

Run this test to ensure everything works:

```bash
tsx scripts/test-backup.ts
```

Should see all tests pass ✅

## 💰 Cost

Approximately **$0.50/month** for 30 daily backups of a 1GB database.

## 🔒 Security

- ✅ Admin-only access
- ✅ Encrypted storage (R2)
- ✅ Audit logs
- ✅ JWT authentication

## Support

If backups fail:
1. Check Vercel logs
2. Verify R2 credentials
3. Check `security_events` table
4. Review `BACKUP_GUIDE.md`
