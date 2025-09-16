# Demo Data Seeder

This script populates your SignalLoop database with realistic demo data for testing and demonstration purposes.

## What it creates

The seeder creates a complete demo environment with:

### 🏢 **Demo Project**
- **Project Name**: "SignalLoop Demo"
- **Slug**: `demo`
- **Plan**: Free tier
- **ID**: `00000000-0000-0000-0000-000000000001`

### 📋 **Demo Board**
- **Name**: "General Feedback"
- **Type**: Public board
- **ID**: `00000000-0000-0000-0000-000000000001`

### 💬 **Demo Posts (10 posts)**
Realistic feedback posts with different statuses:

1. **"Add dark mode theme"** (Planned) - 42 votes
2. **"API rate limiting issues"** (In Progress) - 31 votes  
3. **"Slack integration for notifications"** (Open) - 28 votes
4. **"Keyboard shortcuts for power users"** (Open) - 19 votes
5. **"Export feedback to CSV"** (Done) - 15 votes
6. **"Mobile app for iOS and Android"** (Declined) - 8 votes
7. **"Better search and filtering"** (In Progress) - 34 votes
8. **"Email digest for team members"** (Planned) - 22 votes
9. **"Custom webhook endpoints"** (Open) - 17 votes
10. **"Widget customization options"** (Done) - 25 votes

### 👍 **Realistic Vote Distribution**
- Total votes: **241 votes** across all posts
- Vote counts range from 8-42 votes per post
- Votes distributed over the last 14 days
- Each vote has a unique voter hash

### 💭 **Demo Comments (5 comments)**
Engaging comments from different users:
- Design feedback on dark mode
- Technical discussions on API limits
- Feature requests and support

### 📝 **Demo Changelog (3 entries)**
Recent product updates:
- CSV Export Feature Released
- Improved Widget Customization  
- Performance Improvements

## Usage

### Prerequisites
Make sure you have your environment variables set up in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_service_role_key
```

### Run the seeder

```bash
# Install tsx if not already installed
npm install

# Run the demo seeder
npm run seed-demo
```

### Alternative: Run directly with tsx

```bash
# Install tsx globally
npm install -g tsx

# Run the script directly
tsx scripts/seed-demo.ts
```

## What happens when you run it

1. **🌱 Seeding starts** - Console shows "Seeding demo data..."
2. **🏢 Project created** - Demo project inserted into database
3. **📋 Board created** - General Feedback board created
4. **💬 Posts inserted** - All 10 demo posts added
5. **👍 Votes generated** - 241 realistic votes distributed
6. **💭 Comments added** - 5 engaging comments
7. **📝 Changelog created** - 3 recent updates
8. **✅ Success message** - "Demo data seeded successfully!"

## View the demo

After seeding, visit these URLs to see the demo data:

- **📋 Feedback Board**: `/demo/board`
- **🗺️ Public Roadmap**: `/demo/roadmap` 
- **📝 Changelog**: `/demo/changelog`
- **📊 Admin Dashboard**: `/admin-test` (use project slug: `demo`)

## Demo Data Features

### 🎯 **Realistic Content**
- Professional feedback from various user types
- Different email domains (techstartup.com, acmecorp.com, etc.)
- Varied post lengths and detail levels
- Realistic vote counts based on feature popularity

### 📊 **Status Distribution**
- **Open**: 4 posts (new requests)
- **Planned**: 2 posts (in roadmap)
- **In Progress**: 2 posts (actively being worked on)
- **Done**: 2 posts (completed features)
- **Declined**: 1 post (rejected request)

### ⏰ **Time Distribution**
- Posts spread over the last 12 days
- Comments from 2-6 days ago
- Changelog entries from 3-14 days ago
- Realistic engagement timeline

### 🎨 **Perfect for Demos**
- Shows all status types
- Demonstrates voting system
- Includes comments and discussions
- Shows completed vs. pending work
- Realistic user engagement patterns

## Reset/Cleanup

To remove demo data, you can either:

1. **Delete specific records** by ID:
   ```sql
   DELETE FROM posts WHERE board_id = '00000000-0000-0000-0000-000000000001';
   DELETE FROM boards WHERE id = '00000000-0000-0000-0000-000000000001';
   DELETE FROM projects WHERE id = '00000000-0000-0000-0000-000000000001';
   ```

2. **Re-run the seeder** - It uses `upsert` so it will update existing data

## Troubleshooting

### Environment Variables
Make sure your `.env.local` file has:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE`

### Database Permissions
The service role key needs permissions to:
- Insert into `projects` table
- Insert into `boards` table  
- Insert into `posts` table
- Insert into `votes` table
- Insert into `comments` table
- Insert into `changelog` table

### Common Issues
- **"Error creating demo project"** - Check Supabase connection
- **"Permission denied"** - Verify service role key permissions
- **"Table doesn't exist"** - Run your database migrations first

## Customization

You can modify the demo data by editing `scripts/seed-demo.ts`:

- **Change post content** - Edit the `demoPosts` array
- **Adjust vote counts** - Modify the `generateVotes` calls
- **Add more comments** - Extend the `demoComments` array
- **Update changelog** - Modify the `demoChangelog` array
- **Change time ranges** - Adjust the date calculations

The seeder is designed to be safe to run multiple times - it uses `upsert` operations that will update existing records rather than create duplicates.
