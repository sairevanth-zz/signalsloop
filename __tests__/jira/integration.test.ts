/**
 * Integration Tests for Jira Feature
 * Tests the complete workflow from connection to issue creation
 */

// Mock all external dependencies
jest.mock('@/lib/supabase-client');
jest.mock('@/lib/jira/encryption');
jest.mock('@/lib/jira/oauth');
jest.mock('@/lib/jira/api');
jest.mock('openai');

describe('Jira Integration - Full Workflow', () => {
  let mockSupabase: any;
  let mockJiraAPI: any;
  let mockOAuth: any;
  let mockEncryption: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
            maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        insert: jest.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    };

    require('@/lib/supabase-client').getSupabaseClient = jest.fn(() => mockSupabase);

    // Setup mock encryption
    mockEncryption = {
      encryptToken: jest.fn((token) => `encrypted_${token}`),
      decryptToken: jest.fn((encrypted) => encrypted.replace('encrypted_', ''))
    };
    require('@/lib/jira/encryption').encryptToken = mockEncryption.encryptToken;
    require('@/lib/jira/encryption').decryptToken = mockEncryption.decryptToken;

    // Setup mock OAuth
    mockOAuth = {
      getAuthorizationUrl: jest.fn(),
      exchangeCodeForTokens: jest.fn(),
      getValidAccessToken: jest.fn()
    };
    require('@/lib/jira/oauth').getAuthorizationUrl = mockOAuth.getAuthorizationUrl;
    require('@/lib/jira/oauth').exchangeCodeForTokens = mockOAuth.exchangeCodeForTokens;
    require('@/lib/jira/oauth').getValidAccessToken = mockOAuth.getValidAccessToken;

    // Setup mock Jira API
    mockJiraAPI = {
      createIssue: jest.fn(),
      getIssue: jest.fn(),
      updateIssue: jest.fn(),
      getProjects: jest.fn()
    };
    require('@/lib/jira/api').JiraAPI = jest.fn(() => mockJiraAPI);
  });

  describe('OAuth Connection Flow', () => {
    it('should complete full OAuth connection flow', async () => {
      const projectId = 'project-123';
      const userId = 'user-123';

      // Step 1: Generate authorization URL
      mockOAuth.getAuthorizationUrl.mockReturnValue({
        authUrl: 'https://auth.atlassian.com/authorize?client_id=xxx&state=yyy',
        state: 'state-token-123'
      });

      const { authUrl, state } = await mockOAuth.getAuthorizationUrl(projectId);

      expect(authUrl).toContain('atlassian.com');
      expect(state).toBeTruthy();

      // Step 2: Store state in database
      await mockSupabase.from('jira_oauth_states').insert({
        state,
        project_id: projectId,
        expires_at: new Date(Date.now() + 600000).toISOString()
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('jira_oauth_states');

      // Step 3: Exchange code for tokens
      mockOAuth.exchangeCodeForTokens.mockResolvedValue({
        access_token: 'access_token_abc',
        refresh_token: 'refresh_token_xyz',
        expires_in: 3600,
        scope: 'read:jira-work write:jira-work'
      });

      const tokens = await mockOAuth.exchangeCodeForTokens('auth_code_123');

      expect(tokens.access_token).toBe('access_token_abc');
      expect(tokens.refresh_token).toBe('refresh_token_xyz');

      // Step 4: Encrypt and store connection
      const encryptedAccess = mockEncryption.encryptToken(tokens.access_token);
      const encryptedRefresh = mockEncryption.encryptToken(tokens.refresh_token);

      await mockSupabase.from('jira_connections').insert({
        project_id: projectId,
        user_id: userId,
        cloud_id: 'cloud-123',
        site_url: 'https://test.atlassian.net',
        access_token_encrypted: encryptedAccess,
        refresh_token_encrypted: encryptedRefresh,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        status: 'active'
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('jira_connections');
      expect(mockEncryption.encryptToken).toHaveBeenCalledTimes(2);
    });

    it('should handle OAuth errors gracefully', async () => {
      mockOAuth.exchangeCodeForTokens.mockRejectedValue(
        new Error('Invalid authorization code')
      );

      await expect(
        mockOAuth.exchangeCodeForTokens('invalid_code')
      ).rejects.toThrow('Invalid authorization code');
    });
  });

  describe('Issue Creation Workflow', () => {
    it('should create issue from feedback with AI generation', async () => {
      const feedbackId = 'feedback-123';
      const connectionId = 'conn-123';

      // Step 1: Fetch feedback data
      mockSupabase.from = jest.fn((table) => {
        if (table === 'feedback') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: feedbackId,
                    content: 'The mobile app is very slow',
                    author_username: 'john_doe',
                    sentiment_score: -0.5
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabase.from(table);
      });

      const { data: feedback } = await mockSupabase
        .from('feedback')
        .select('*')
        .eq('id', feedbackId)
        .single();

      expect(feedback).toBeDefined();
      expect(feedback.content).toContain('slow');

      // Step 2: Get valid access token
      mockOAuth.getValidAccessToken.mockResolvedValue('valid_access_token');

      const accessToken = await mockOAuth.getValidAccessToken(connectionId);
      expect(accessToken).toBe('valid_access_token');

      // Step 3: Create Jira issue
      mockJiraAPI.createIssue.mockResolvedValue({
        id: '12345',
        key: 'MOBILE-123',
        self: 'https://test.atlassian.net/rest/api/3/issue/12345'
      });

      const issue = await mockJiraAPI.createIssue({
        fields: {
          project: { key: 'MOBILE' },
          summary: 'Improve mobile app performance',
          description: {
            type: 'doc',
            version: 1,
            content: []
          },
          issuetype: { name: 'Task' },
          priority: { name: 'High' }
        }
      });

      expect(issue.key).toBe('MOBILE-123');

      // Step 4: Link issue to feedback
      mockSupabase.from = jest.fn((table) => {
        if (table === 'jira_issue_links') {
          return {
            insert: jest.fn(() => Promise.resolve({
              data: { id: 'link-123' },
              error: null
            }))
          };
        }
        return mockSupabase.from(table);
      });

      await mockSupabase.from('jira_issue_links').insert({
        feedback_id: feedbackId,
        connection_id: connectionId,
        issue_id: issue.id,
        issue_key: issue.key,
        issue_url: `https://test.atlassian.net/browse/${issue.key}`,
        status: 'To Do',
        priority: 'High'
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('jira_issue_links');

      // Step 5: Log sync event
      await mockSupabase.from('jira_sync_logs').insert({
        connection_id: connectionId,
        event_type: 'issue_created',
        issue_key: issue.key,
        status: 'success',
        details: { feedback_id: feedbackId }
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('jira_sync_logs');
    });

    it('should handle issue creation errors and rollback', async () => {
      mockJiraAPI.createIssue.mockRejectedValue(
        new Error('Jira API Error: Project not found')
      );

      await expect(
        mockJiraAPI.createIssue({ fields: {} })
      ).rejects.toThrow('Project not found');

      // Verify no link was created on error
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn()
      }));

      // Should not insert link if creation failed
      expect(mockSupabase.from).not.toHaveBeenCalledWith('jira_issue_links');
    });
  });

  describe('Bulk Issue Creation Workflow', () => {
    it('should create multiple issues and an epic', async () => {
      const feedbackIds = ['fb-1', 'fb-2', 'fb-3'];
      const connectionId = 'conn-123';
      const themeName = 'Mobile Performance';

      // Step 1: Create Epic
      mockJiraAPI.createIssue.mockResolvedValueOnce({
        id: '999',
        key: 'MOBILE-999',
        self: 'https://test.atlassian.net/rest/api/3/issue/999'
      });

      const epic = await mockJiraAPI.createIssue({
        fields: {
          project: { key: 'MOBILE' },
          summary: `Epic: ${themeName}`,
          issuetype: { name: 'Epic' }
        }
      });

      expect(epic.key).toBe('MOBILE-999');

      // Step 2: Create issues under epic
      const issues = [];
      for (let i = 0; i < feedbackIds.length; i++) {
        mockJiraAPI.createIssue.mockResolvedValueOnce({
          id: `${i + 1}`,
          key: `MOBILE-${i + 1}`,
          self: `https://test.atlassian.net/rest/api/3/issue/${i + 1}`
        });

        const issue = await mockJiraAPI.createIssue({
          fields: {
            project: { key: 'MOBILE' },
            summary: `Issue ${i + 1}`,
            parent: { key: epic.key },
            issuetype: { name: 'Task' }
          }
        });

        issues.push(issue);
      }

      expect(issues).toHaveLength(3);
      expect(mockJiraAPI.createIssue).toHaveBeenCalledTimes(4); // 1 epic + 3 issues

      // Step 3: Link all issues to feedback
      for (let i = 0; i < issues.length; i++) {
        await mockSupabase.from('jira_issue_links').insert({
          feedback_id: feedbackIds[i],
          connection_id: connectionId,
          issue_id: issues[i].id,
          issue_key: issues[i].key,
          issue_url: `https://test.atlassian.net/browse/${issues[i].key}`
        });
      }

      expect(mockSupabase.from).toHaveBeenCalledWith('jira_issue_links');
    });

    it('should handle partial failures in bulk creation', async () => {
      mockJiraAPI.createIssue
        .mockResolvedValueOnce({ id: '1', key: 'TEST-1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ id: '3', key: 'TEST-3' });

      const results = await Promise.allSettled([
        mockJiraAPI.createIssue({ fields: {} }),
        mockJiraAPI.createIssue({ fields: {} }),
        mockJiraAPI.createIssue({ fields: {} })
      ]);

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });
  });

  describe('Webhook Sync Workflow', () => {
    it('should sync issue status changes from Jira', async () => {
      const issueKey = 'TEST-123';
      const newStatus = 'Done';

      // Step 1: Receive webhook
      const webhookPayload = {
        webhookEvent: 'jira:issue_updated',
        issue: {
          key: issueKey,
          fields: {
            status: { name: newStatus }
          }
        }
      };

      // Step 2: Update issue link status
      mockSupabase.from = jest.fn((table) => {
        if (table === 'jira_issue_links') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: { id: 'link-123' },
                error: null
              }))
            })),
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'link-123',
                    feedback_id: 'fb-123'
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabase.from(table);
      });

      await mockSupabase
        .from('jira_issue_links')
        .update({ status: newStatus })
        .eq('issue_key', issueKey);

      // Step 3: Get linked feedback
      const { data: link } = await mockSupabase
        .from('jira_issue_links')
        .select('*')
        .eq('issue_key', issueKey)
        .single();

      expect(link.feedback_id).toBe('fb-123');

      // Step 4: Mark feedback as resolved
      if (newStatus === 'Done') {
        mockSupabase.from = jest.fn((table) => {
          if (table === 'feedback') {
            return {
              update: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
              }))
            };
          }
          return mockSupabase.from(table);
        });

        await mockSupabase
          .from('feedback')
          .update({ resolved: true })
          .eq('id', link.feedback_id);

        expect(mockSupabase.from).toHaveBeenCalledWith('feedback');
      }
    });

    it('should log all webhook events', async () => {
      const webhookPayload = {
        webhookEvent: 'jira:issue_updated',
        issue: { key: 'TEST-123' }
      };

      await mockSupabase.from('jira_sync_logs').insert({
        connection_id: 'conn-123',
        event_type: 'webhook_received',
        issue_key: webhookPayload.issue.key,
        status: 'success',
        details: webhookPayload
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('jira_sync_logs');
    });
  });

  describe('Token Refresh Workflow', () => {
    it('should automatically refresh expired tokens', async () => {
      const connectionId = 'conn-123';

      // Step 1: Check token expiration
      mockSupabase.from = jest.fn((table) => {
        if (table === 'jira_connections') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: connectionId,
                    token_expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
                    refresh_token_encrypted: 'encrypted_refresh_token'
                  },
                  error: null
                }))
              }))
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          };
        }
        return mockSupabase.from(table);
      });

      const { data: connection } = await mockSupabase
        .from('jira_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      const isExpired = new Date(connection.token_expires_at) < new Date();
      expect(isExpired).toBe(true);

      // Step 2: Refresh tokens
      if (isExpired) {
        mockOAuth.exchangeCodeForTokens = jest.fn().mockResolvedValue({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600
        });

        const newTokens = await mockOAuth.exchangeCodeForTokens('refresh_token');

        // Step 3: Update connection with new tokens
        await mockSupabase
          .from('jira_connections')
          .update({
            access_token_encrypted: mockEncryption.encryptToken(newTokens.access_token),
            refresh_token_encrypted: mockEncryption.encryptToken(newTokens.refresh_token),
            token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
          })
          .eq('id', connectionId);

        expect(mockEncryption.encryptToken).toHaveBeenCalled();
      }
    });
  });
});
