# Spec Writer Navigation Integration Guide

This guide shows you exactly how to integrate the Spec Writer feature into your SignalsLoop dashboard navigation.

## 🎯 Integration Points

The Spec Writer should be accessible from multiple places for maximum discoverability:

1. **Main Navigation Menu** (Board page dropdown)
2. **Dashboard Widget** (On the main dashboard/app page)
3. **Feedback Board** (Generate spec from selected feedback)
4. **Quick Actions Sidebar** (If applicable)

---

## 1. Board Page Dropdown Menu Integration

**File**: `src/app/[slug]/board/page.tsx`

**Location**: Inside the `DropdownMenuContent` around line 1070 (after User Stories)

**Add this code**:

```tsx
{user && (
  <Link href={`/${project?.slug}/specs`}>
    <DropdownMenuItem className="flex items-start gap-3 py-3">
      <Sparkles className="h-4 w-4 text-purple-600" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">Spec Writer ✨</span>
        <span className="text-xs text-gray-500">
          Transform ideas into PRDs in 60 seconds
        </span>
      </div>
    </DropdownMenuItem>
  </Link>
)}
```

**Complete Context**:
```tsx
{user && (
  <Link href={`/app/user-stories?projectId=${project?.id}`}>
    <DropdownMenuItem className="flex items-start gap-3 py-3">
      <FileText className="h-4 w-4 text-blue-600" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">User Stories</span>
        <span className="text-xs text-gray-500">
          AI-generated sprint-ready stories from themes
        </span>
      </div>
    </DropdownMenuItem>
  </Link>
)}

{/* ADD SPEC WRITER HERE */}
{user && (
  <Link href={`/${project?.slug}/specs`}>
    <DropdownMenuItem className="flex items-start gap-3 py-3">
      <Sparkles className="h-4 w-4 text-purple-600" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">Spec Writer ✨</span>
        <span className="text-xs text-gray-500">
          Transform ideas into PRDs in 60 seconds
        </span>
      </div>
    </DropdownMenuItem>
  </Link>
)}

{isOwnerOrAdmin && <DropdownMenuSeparator />}
```

---

## 2. Dashboard Widget Integration

**File**: `src/app/app/page.tsx` (or wherever your main dashboard is)

**Add the import**:
```tsx
import { SpecsDashboardWidget } from '@/components/specs';
```

**Add the widget** (in your dashboard grid/layout):
```tsx
<SpecsDashboardWidget
  projectId={project.id}
  projectSlug={project.slug}
/>
```

**Example placement in a grid**:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Existing widgets */}
  <SentimentWidget projectId={project.id} />
  <FeedbackStatsWidget projectId={project.id} />

  {/* Add Spec Writer Widget */}
  <SpecsDashboardWidget
    projectId={project.id}
    projectSlug={project.slug}
  />
</div>
```

---

## 3. Feedback Board Integration (Generate from Selected)

**File**: `src/app/[slug]/board/page.tsx`

**Step 1**: Add imports at the top:
```tsx
import { GenerateSpecFromFeedback } from '@/components/specs';
```

**Step 2**: Add state for selected feedback (if not already exists):
```tsx
const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
```

**Step 3**: Add selection checkbox to feedback items:
```tsx
// In your feedback item card rendering:
<input
  type="checkbox"
  checked={selectedFeedback.includes(post.id)}
  onChange={(e) => {
    if (e.target.checked) {
      setSelectedFeedback([...selectedFeedback, post.id]);
    } else {
      setSelectedFeedback(selectedFeedback.filter(id => id !== post.id));
    }
  }}
  className="h-4 w-4 rounded border-gray-300"
/>
```

**Step 4**: Add the Generate Spec button (near the top actions):
```tsx
{selectedFeedback.length > 0 && (
  <GenerateSpecFromFeedback
    selectedFeedback={posts.filter(p => selectedFeedback.includes(p.id)).map(p => ({
      id: p.id,
      title: p.title,
      vote_count: p.vote_count,
      category: p.category
    }))}
    projectSlug={project?.slug || ''}
    onClear={() => setSelectedFeedback([])}
  />
)}
```

---

## 4. Quick Actions Sidebar Integration (Optional)

**File**: `src/components/QuickActionsSidebar.tsx`

**Add to the feature highlights**:
```tsx
{
  id: 'spec-writer',
  name: 'Spec Writer',
  description: 'AI-powered PRD generation from ideas',
  icon: <Sparkles className="w-4 h-4" />,
  color: 'bg-purple-100 text-purple-700 border-purple-200',
  link: `/${projectSlug}/specs`
}
```

---

## 5. Global Navigation Bar (If Exists)

If you have a persistent navigation bar with links like:
- Dashboard
- Feedback
- Roadmap
- Settings

**Add**:
```tsx
<Link
  href={`/${projectSlug}/specs`}
  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/20"
>
  <Sparkles className="h-5 w-5 text-purple-600" />
  <span>Spec Writer</span>
</Link>
```

---

## 📊 Analytics Integration (Optional but Recommended)

If you're using PostHog or similar analytics, track these events:

```tsx
// When user opens Spec Writer
posthog.capture('spec_writer_opened', {
  source: 'board_menu' | 'dashboard_widget' | 'feedback_selection' | 'direct_link',
  projectId: project.id
});

// When user starts generation
posthog.capture('spec_generation_started', {
  inputType: 'idea' | 'feedback',
  feedbackCount: feedbackIds.length,
  template: template
});
```

---

## 🎨 Visual Consistency

**Icon**: Use `Sparkles` from `lucide-react` (✨)
**Color Scheme**: Purple (`text-purple-600`, `bg-purple-600`)
**Badge**: Optional "NEW" or "AI" badge

Example with badge:
```tsx
<span className="text-sm font-medium text-gray-900">
  Spec Writer
  <Badge variant="secondary" className="ml-2 text-xs">NEW</Badge>
</span>
```

---

## 🧪 Testing Checklist

After integration, test:

- [ ] Can navigate to Spec Writer from board menu
- [ ] Can navigate to Spec Writer from dashboard widget
- [ ] Can select multiple feedback items
- [ ] Generate Spec button appears when feedback selected
- [ ] Clicking Generate Spec navigates to wizard with feedback pre-selected
- [ ] Wizard shows feedback count correctly
- [ ] Can generate spec from both ideas and feedback
- [ ] All navigation links work correctly
- [ ] Mobile responsive (all navigation items accessible)

---

## 🚀 Quick Implementation Checklist

1. **Add to Board Menu** ✅
   - Copy code from Section 1
   - Paste after User Stories menu item
   - Save and test

2. **Add Dashboard Widget** ✅
   - Import `SpecsDashboardWidget`
   - Add to dashboard grid
   - Save and test

3. **Add Feedback Selection** ✅
   - Import `GenerateSpecFromFeedback`
   - Add selection state
   - Add checkboxes to feedback items
   - Add Generate button
   - Test selection → generation flow

4. **Test Everything** ✅
   - Test all navigation paths
   - Test feedback selection
   - Test spec generation
   - Test on mobile

---

## 📝 Example: Complete Board Menu Section

Here's what the complete menu should look like with Spec Writer:

```tsx
<DropdownMenuContent align="end" className="w-72">
  {/* ... other menu items ... */}

  {user && (
    <Link href={`/${project?.slug}/ai-insights`}>
      <DropdownMenuItem className="flex items-start gap-3 py-3">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">AI Insights & Themes</span>
          <span className="text-xs text-gray-500">
            Discover themes, patterns, and sentiment
          </span>
        </div>
      </DropdownMenuItem>
    </Link>
  )}

  {user && (
    <Link href={`/app/user-stories?projectId=${project?.id}`}>
      <DropdownMenuItem className="flex items-start gap-3 py-3">
        <FileText className="h-4 w-4 text-blue-600" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">User Stories</span>
          <span className="text-xs text-gray-500">
            AI-generated sprint-ready stories from themes
          </span>
        </div>
      </DropdownMenuItem>
    </Link>
  )}

  {/* NEW: Spec Writer */}
  {user && (
    <Link href={`/${project?.slug}/specs`}>
      <DropdownMenuItem className="flex items-start gap-3 py-3">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            Spec Writer ✨
          </span>
          <span className="text-xs text-gray-500">
            Transform ideas into PRDs in 60 seconds
          </span>
        </div>
      </DropdownMenuItem>
    </Link>
  )}

  {/* ... rest of menu ... */}
</DropdownMenuContent>
```

---

## 🎯 Priority Order

If you can only do some integrations:

1. **MUST DO**: Board menu dropdown (most common entry point)
2. **SHOULD DO**: Dashboard widget (discovery)
3. **NICE TO HAVE**: Feedback selection (power user feature)
4. **OPTIONAL**: Quick actions sidebar

---

## 💬 User Messaging

Consider adding a one-time announcement after deploying:

```tsx
// Toast notification on first dashboard visit after deployment
if (!localStorage.getItem('spec_writer_announced')) {
  toast.success('🎉 NEW: Spec Writer - Transform ideas into PRDs in 60 seconds!', {
    action: {
      label: 'Try it',
      onClick: () => router.push(`/${projectSlug}/specs`)
    }
  });
  localStorage.setItem('spec_writer_announced', 'true');
}
```

---

That's it! Your Spec Writer feature will now be easily discoverable throughout the application. 🚀
