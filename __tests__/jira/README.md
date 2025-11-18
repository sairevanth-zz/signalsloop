# Jira Integration Test Suite

Comprehensive test coverage for the Jira OAuth integration feature.

## Test Structure

```
__tests__/jira/
├── hooks.test.tsx           # React hooks unit tests
├── components.test.tsx      # React components unit tests
├── api-routes.test.ts       # API route handlers tests
├── integration.test.ts      # End-to-end workflow tests
└── README.md               # This file
```

## Running Tests

### Run All Jira Tests

```bash
npm test -- __tests__/jira
```

### Run Specific Test Files

```bash
# Hooks only
npm test -- __tests__/jira/hooks.test.tsx

# Components only
npm test -- __tests__/jira/components.test.tsx

# API routes only
npm test -- __tests__/jira/api-routes.test.ts

# Integration tests only
npm test -- __tests__/jira/integration.test.ts
```

### Run Tests in Watch Mode

```bash
npm test -- __tests__/jira --watch
```

### Run Tests with Coverage

```bash
npm test -- __tests__/jira --coverage
```

## Test Coverage

### 1. Hooks Tests (`hooks.test.tsx`)

Tests all custom React hooks used for Jira integration:

- **useJiraConnection**
  - ✅ Loading state initialization
  - ✅ Fetching connection data
  - ✅ Handling empty project ID
  - ✅ Error handling
  - ✅ Refetch functionality

- **useJiraIssueLink**
  - ✅ Null feedback ID handling
  - ✅ Fetching existing issue links
  - ✅ Determining if issue exists
  - ✅ Refetch functionality

- **useCreateJiraIssue**
  - ✅ Initial state
  - ✅ Successful issue creation
  - ✅ API error handling
  - ✅ Error clearing on retry

### 2. Component Tests (`components.test.tsx`)

Tests all React UI components:

- **CreateIssueButton**
  - ✅ Not rendering when Jira disconnected
  - ✅ Rendering button when connected
  - ✅ Showing badge when issue exists
  - ✅ Opening modal on click
  - ✅ Loading state handling

- **JiraIssueBadge**
  - ✅ Rendering issue key
  - ✅ Showing status when enabled
  - ✅ Showing priority when enabled
  - ✅ Showing assignee when enabled
  - ✅ Opening Jira URL on click

- **ConnectJiraButton**
  - ✅ Showing connect button when disconnected
  - ✅ Showing connected status
  - ✅ Initiating OAuth flow
  - ✅ Loading state

### 3. API Route Tests (`api-routes.test.ts`)

Tests all API endpoint handlers:

- **Connect Route** (`/api/integrations/jira/connect`)
  - ✅ Generating authorization URL
  - ✅ Storing OAuth state

- **Callback Route** (`/api/integrations/jira/callback`)
  - ✅ Exchanging code for tokens
  - ✅ Encrypting tokens
  - ✅ Storing connection
  - ✅ Handling invalid state

- **Create Issue Route** (`/api/integrations/jira/create-issue`)
  - ✅ Creating issue with AI
  - ✅ Linking issue to feedback
  - ✅ Handling Jira API errors
  - ✅ Logging sync events

- **Bulk Create Route** (`/api/integrations/jira/bulk-create`)
  - ✅ Creating multiple issues
  - ✅ Creating epic and linking issues
  - ✅ Handling partial failures

- **Webhook Route** (`/api/integrations/jira/webhook`)
  - ✅ Handling status updates
  - ✅ Marking feedback as resolved
  - ✅ Logging webhook events

- **Disconnect Route** (`/api/integrations/jira/disconnect`)
  - ✅ Deleting connection
  - ✅ Cascade deleting related records

### 4. Integration Tests (`integration.test.ts`)

Tests complete user workflows:

- **OAuth Connection Flow**
  - ✅ Full OAuth flow from start to finish
  - ✅ Error handling during OAuth
  - ✅ Token encryption and storage

- **Issue Creation Workflow**
  - ✅ Creating issue from feedback with AI
  - ✅ Linking issue to feedback
  - ✅ Logging sync events
  - ✅ Rollback on errors

- **Bulk Issue Creation Workflow**
  - ✅ Creating multiple issues and epic
  - ✅ Linking issues to epic
  - ✅ Handling partial failures

- **Webhook Sync Workflow**
  - ✅ Syncing status changes from Jira
  - ✅ Marking feedback as resolved
  - ✅ Logging webhook events

- **Token Refresh Workflow**
  - ✅ Detecting expired tokens
  - ✅ Automatically refreshing tokens
  - ✅ Updating connection with new tokens

## Mocking Strategy

### External Services Mocked

1. **Supabase Client** - All database operations
2. **Jira API** - All Atlassian REST API calls
3. **OpenAI** - AI-powered issue generation
4. **OAuth** - Token exchange and validation
5. **Encryption** - Token encryption/decryption

### Why Mock?

- Tests run without database connection
- Tests run without external API dependencies
- Tests are fast and deterministic
- Tests don't consume API quotas
- Tests work in CI/CD environments

## Test Data

### Mock Jira Connection

```typescript
{
  id: 'conn-123',
  project_id: 'project-123',
  user_id: 'user-123',
  cloud_id: 'cloud-123',
  site_url: 'https://test.atlassian.net',
  default_project_key: 'TEST',
  status: 'active'
}
```

### Mock Jira Issue

```typescript
{
  id: '12345',
  key: 'TEST-123',
  self: 'https://test.atlassian.net/rest/api/3/issue/12345',
  fields: {
    summary: 'Test Issue',
    status: { name: 'To Do' },
    priority: { name: 'Medium' }
  }
}
```

### Mock Issue Link

```typescript
{
  id: 'link-123',
  feedback_id: 'feedback-123',
  connection_id: 'conn-123',
  issue_id: '12345',
  issue_key: 'TEST-123',
  issue_url: 'https://test.atlassian.net/browse/TEST-123',
  status: 'To Do',
  priority: 'Medium'
}
```

## Expected Test Results

When all tests pass, you should see:

```
PASS  __tests__/jira/hooks.test.tsx
  useJiraConnection
    ✓ should initialize with loading state
    ✓ should handle empty project ID
    ✓ should provide refetch function
    ✓ should handle connection data
    ✓ should handle fetch errors gracefully
  useJiraIssueLink
    ✓ should return null when feedbackId is null
    ✓ should provide refetch function
    ✓ should handle existing issue link
  useCreateJiraIssue
    ✓ should initialize with correct state
    ✓ should handle successful issue creation
    ✓ should handle API errors
    ✓ should clear error on retry

PASS  __tests__/jira/components.test.tsx
  CreateIssueButton
    ✓ should not render when Jira is not connected
    ✓ should render button when connected but no issue exists
    ✓ should show badge when issue already exists
    ✓ should open modal when button is clicked
    ✓ should handle loading state
  JiraIssueBadge
    ✓ should render issue key
    ✓ should render status when showStatus is true
    ✓ should render priority when showPriority is true
    ✓ should render assignee when showAssignee is true
    ✓ should open Jira URL when clicked
  ConnectJiraButton
    ✓ should show connect button when not connected
    ✓ should show connected status when connected
    ✓ should initiate OAuth flow when clicked
    ✓ should show loading state during connection

PASS  __tests__/jira/api-routes.test.ts
  Jira Connect API Route
    ✓ should generate authorization URL
    ✓ should store OAuth state in database
  Jira Callback API Route
    ✓ should exchange authorization code for tokens
    ✓ should encrypt tokens before storing
    ✓ should store connection in database
    ✓ should handle invalid state token
  Jira Create Issue API Route
    ✓ should create issue with AI generation
    ✓ should link created issue to feedback
    ✓ should handle Jira API errors
    ✓ should log sync event
  Jira Bulk Create API Route
    ✓ should create multiple issues
    ✓ should create epic and link issues
    ✓ should handle partial failures gracefully
  Jira Webhook API Route
    ✓ should handle issue status update
    ✓ should mark feedback as resolved when issue is done
    ✓ should log webhook event
  Jira Disconnect API Route
    ✓ should delete connection
    ✓ should cascade delete related records

PASS  __tests__/jira/integration.test.ts
  Jira Integration - Full Workflow
    OAuth Connection Flow
      ✓ should complete full OAuth connection flow
      ✓ should handle OAuth errors gracefully
    Issue Creation Workflow
      ✓ should create issue from feedback with AI generation
      ✓ should handle issue creation errors and rollback
    Bulk Issue Creation Workflow
      ✓ should create multiple issues and an epic
      ✓ should handle partial failures in bulk creation
    Webhook Sync Workflow
      ✓ should sync issue status changes from Jira
      ✓ should log all webhook events
    Token Refresh Workflow
      ✓ should automatically refresh expired tokens

Test Suites: 4 passed, 4 total
Tests:       50+ passed, 50+ total
```

## Troubleshooting

### Tests Failing Due to Missing Mocks

If you see errors like "Cannot find module", ensure all dependencies are mocked in `beforeEach` blocks.

### Tests Failing Due to TypeScript Errors

Run TypeScript check first:
```bash
npx tsc --noEmit
```

### Tests Timing Out

Increase timeout in jest.config.js:
```javascript
testTimeout: 10000
```

## Future Test Additions

- [ ] E2E tests with Playwright
- [ ] Performance tests for bulk operations
- [ ] Security tests for token encryption
- [ ] Load tests for webhook handling
- [ ] Snapshot tests for UI components

## Related Documentation

- `JIRA_INTEGRATION_README.md` - Integration setup guide
- `JIRA_SETUP_REQUIRED.md` - Quick setup instructions
- `SECURITY.md` - Security considerations
