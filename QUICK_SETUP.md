# 🚀 SignalLoop Quick Setup Guide

## The Problem
Your SignalLoop app is currently not functional because it needs a Supabase database with proper tables and authentication setup.

## 🎯 Solution (15 minutes setup)

### Step 1: Create Supabase Project (5 minutes)
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `signalloop`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for setup to complete

### Step 2: Set Up Database Schema (5 minutes)
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase-setup.sql` (in this repository)
4. Paste it into the SQL Editor
5. Click **"Run"** 
6. You should see: `"SignalLoop database setup completed successfully!"`

### Step 3: Configure Environment Variables (3 minutes)
1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xyz.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role secret key** (starts with `eyJ...`)

3. In your project root, create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE=your_service_role_key_here
```

### Step 4: Test the Setup (2 minutes)
1. Restart your development server: `npm run dev`
2. Go to `http://localhost:3000/app/create`
3. Try creating a test project
4. If successful, you'll be redirected to your new board!

## ✅ Verification Checklist

After setup, test these features:

- [ ] **Project Creation**: `/app/create` works
- [ ] **User Authentication**: Email signup/login works  
- [ ] **Voting**: Can vote on posts
- [ ] **Comments**: Can add comments to posts
- [ ] **Dashboard**: `/app` shows your projects
- [ ] **Settings**: `/your-project/settings` accessible

## 🐛 Troubleshooting

### "Database connection not available"
- Check your `.env.local` file has correct Supabase URL and keys
- Restart your development server after adding env vars

### "Project not found" 
- Make sure you ran the SQL setup script completely
- Check that tables were created in Supabase dashboard

### "Permission denied"
- The RLS policies should allow public access to posts/votes
- Check that RLS is enabled on all tables

### Authentication not working
- Verify your Supabase project is fully initialized
- Check that auth is enabled in Supabase dashboard

## 🎉 What Works After Setup

Once configured, your SignalLoop app will have:

✅ **Full Project Management**
- Create unlimited projects
- Custom project slugs
- Project settings and configuration

✅ **Working Feedback Boards**
- Real voting system
- Comment functionality  
- Post status management
- Admin controls

✅ **User Authentication**
- Email-based signup/login
- User dashboards
- Project ownership

✅ **API & Embedding**
- Generate API keys
- Widget embedding
- Custom widget settings

✅ **Payment Integration**
- Stripe configuration
- Pro plan upgrades
- Billing management

## 🚀 Deploy to Production

After local testing works:

1. **Add environment variables to Vercel**:
   - Go to your Vercel project settings
   - Add all the same env vars from `.env.local`

2. **Deploy**: Your app will automatically deploy with working database!

## 💡 Pro Tips

- **Free Tier**: Supabase free tier supports up to 500MB database and 50,000 monthly active users
- **Backup**: Supabase automatically backs up your database
- **Monitoring**: Check Supabase dashboard for usage and performance metrics
- **Scaling**: Easy to upgrade Supabase plan as you grow

## 📞 Need Help?

If you run into issues:
1. Check the Supabase dashboard for any error messages
2. Verify all environment variables are correct
3. Make sure the SQL script ran completely without errors
4. Check the browser console for any JavaScript errors

Your SignalLoop app will be fully functional after this setup! 🎉
