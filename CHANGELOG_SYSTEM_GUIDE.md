# SignalsLoop Changelog System

A comprehensive, professional changelog system inspired by GitHub, Stripe, and other leading product companies.

## 🚀 Features

### 1. Public Changelog Pages
- **Public changelog page**: `/[slug]/changelog`
- **Individual release pages**: `/[slug]/changelog/[releaseSlug]`
- **Rich text formatting** with HTML support
- **Media gallery** for screenshots and videos
- **Release categories** (Features, Improvements, Fixes, Security, Breaking Changes)
- **Search and filtering** capabilities
- **Mobile-responsive** design

### 2. Admin Management Interface
- **Rich text editor** with markdown support
- **Media upload** capability for screenshots and videos
- **Release scheduling** and draft management
- **Template system** for common release types
- **Bulk operations** and release management
- **Preview mode** before publishing

### 3. Integration Features
- **Feedback linking**: Connect releases to related user feedback
- **Automatic status updates**: Mark feedback as "Done" when released
- **User notifications**: Email subscribers about new releases
- **Backlog planning**: Plan releases based on user feedback

### 4. Subscription & Notifications
- **Email subscriptions** with customizable preferences
- **RSS feed** generation: `/[slug]/changelog/rss`
- **Webhook notifications** for external services
- **Slack/Discord integration** ready
- **Notification preferences** (major, minor, patch, hotfix)

### 5. SEO & Sharing
- **Individual pages** for each release
- **Social media cards** and Open Graph tags
- **Email templates** for announcements
- **Analytics tracking** for engagement
- **Sitemap integration**

## 📋 Database Schema

### Core Tables

#### `changelog_releases`
- Main release information
- Publishing status and scheduling
- Version and release type tracking
- Rich content and metadata

#### `changelog_entries`
- Individual features/fixes within releases
- Entry types and priorities
- Ordering and categorization
- Icon and color customization

#### `changelog_media`
- Screenshots and video attachments
- Alt text and captions
- Display ordering
- Video thumbnail support

#### `changelog_subscriptions`
- Email subscription management
- Notification preferences
- Subscription tokens for security

#### `changelog_feedback_links`
- Links between releases and user feedback
- Enables "Done" status updates
- Feedback tracking and attribution

#### `changelog_webhooks`
- External service integration
- Webhook URL and secret management
- Event filtering and testing

## 🛠 Setup Instructions

### 1. Database Setup

Run the database migrations in order:

```sql
-- 1. Create the core schema
\i changelog-schema.sql

-- 2. Add RLS policies
\i changelog-rls-policies.sql
```

### 2. Admin Integration

Add the changelog manager to your project settings:

```tsx
// In your project settings page
import ChangelogManager from '@/components/ChangelogManager';

<ChangelogManager 
  projectId={project.id} 
  projectSlug={project.slug} 
/>
```

### 3. Navigation Updates

Add changelog links to your navigation:

```tsx
// Add to your project navigation
<Link href={`/${project.slug}/changelog`}>
  Changelog
</Link>
```

## 📱 Usage Examples

### Creating a Release

```typescript
// Via API
const response = await fetch(`/api/projects/${projectId}/changelog`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'New Dashboard Features',
    slug: 'new-dashboard-features',
    content: '<h2>What\'s New</h2><p>We\'ve added several exciting features...</p>',
    excerpt: 'Enhanced dashboard with new analytics and customization options',
    release_type: 'minor',
    version: '2.1.0',
    tags: ['dashboard', 'analytics', 'customization'],
    is_featured: true,
    entries: [
      {
        title: 'Real-time Analytics',
        description: 'View your metrics in real-time with live updates',
        entry_type: 'feature',
        priority: 'high'
      },
      {
        title: 'Custom Dashboard Layouts',
        description: 'Drag and drop to customize your dashboard',
        entry_type: 'improvement',
        priority: 'medium'
      }
    ],
    media: [
      {
        file_url: 'https://example.com/screenshot.png',
        file_type: 'image/png',
        alt_text: 'New dashboard screenshot',
        caption: 'The new dashboard interface'
      }
    ]
  })
});
```

### Subscribing Users

```typescript
// Email subscription
const response = await fetch(`/api/${projectSlug}/changelog/subscribe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    preferences: {
      email: true,
      major: true,
      minor: true,
      patch: false,
      hotfix: true
    }
  })
});
```

### Setting up Webhooks

```typescript
// Create webhook
const response = await fetch(`/api/projects/${projectId}/changelog/webhooks`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    webhook_url: 'https://your-service.com/webhook',
    events: ['release.published'],
    webhook_secret: 'your-secret-key'
  })
});
```

## 🎨 Customization

### Release Types
- **major**: Breaking changes, major new features
- **minor**: New features, improvements
- **patch**: Bug fixes, small improvements
- **hotfix**: Critical fixes, security patches

### Entry Types
- **feature**: New functionality
- **improvement**: Enhancements to existing features
- **fix**: Bug fixes
- **security**: Security-related updates
- **breaking**: Breaking changes

### Styling
The changelog uses Tailwind CSS and can be customized by:
- Modifying component styles in `PublicChangelog.tsx`
- Updating color schemes and icons
- Customizing the layout and typography

## 🔗 API Endpoints

### Public Endpoints
- `GET /[slug]/changelog` - Public changelog page
- `GET /[slug]/changelog/[releaseSlug]` - Individual release
- `GET /[slug]/changelog/rss` - RSS feed
- `POST /[slug]/changelog/subscribe` - Email subscription
- `DELETE /[slug]/changelog/subscribe` - Unsubscribe

### Admin Endpoints
- `GET /api/projects/[projectId]/changelog` - List releases
- `POST /api/projects/[projectId]/changelog` - Create release
- `GET /api/projects/[projectId]/changelog/[releaseId]` - Get release
- `PATCH /api/projects/[projectId]/changelog/[releaseId]` - Update release
- `DELETE /api/projects/[projectId]/changelog/[releaseId]` - Delete release
- `GET /api/projects/[projectId]/changelog/webhooks` - List webhooks
- `POST /api/projects/[projectId]/changelog/webhooks` - Create webhook
- `PUT /api/projects/[projectId]/changelog/webhooks` - Test webhook

## 🔐 Security Features

- **Row Level Security (RLS)** on all tables
- **Subscription tokens** for secure unsubscribing
- **Webhook signatures** for verification
- **Admin-only** access to management features
- **Public read-only** access to published content

## 📊 Analytics & Tracking

The system includes built-in analytics tracking:
- Release views and engagement
- Subscription metrics
- Webhook delivery status
- User interaction tracking

## 🚀 Future Enhancements

Planned features for future releases:
- **Slack/Discord bots** for notifications
- **Release templates** and automation
- **Advanced analytics** dashboard
- **Multi-language** support
- **Release scheduling** and automation
- **Integration marketplace** for third-party services

## 📞 Support

For questions or issues with the changelog system:
1. Check the troubleshooting guide below
2. Review the API documentation
3. Contact support with specific error messages

## 🔧 Troubleshooting

### Common Issues

1. **Releases not appearing publicly**
   - Check `is_published` status
   - Verify RLS policies
   - Ensure proper project permissions

2. **Email subscriptions not working**
   - Verify SMTP configuration
   - Check subscription tokens
   - Review notification preferences

3. **Webhooks failing**
   - Test webhook URLs
   - Verify signature validation
   - Check event filtering

4. **Media upload issues**
   - Verify file size limits
   - Check supported file types
   - Ensure proper CORS configuration

This changelog system provides a professional, scalable solution for keeping your users informed about product updates while maintaining engagement and building trust through transparency.
