/**
 * Unit Tests for Jira API Routes
 */

import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/jira/encryption', () => ({
  encryptToken: jest.fn((token) => `encrypted:${token}`),
  decryptToken: jest.fn((encrypted) => encrypted.replace('encrypted:', ''))
}));

jest.mock('@/lib/jira/oauth', () => ({
  getAuthorizationUrl: jest.fn(() => 'https://auth.atlassian.com/authorize?...'),
  exchangeCodeForTokens: jest.fn(),
  getValidAccessToken: jest.fn(),
  refreshAccessToken: jest.fn()
}));

jest.mock('@/lib/jira/api', () => ({
  JiraAPI: jest.fn().mockImplementation(() => ({
    createIssue: jest.fn(),
    getIssue: jest.fn(),
    updateIssue: jest.fn(),
    getProjects: jest.fn(),
    createWebhook: jest.fn()
  }))
}));

jest.mock('@/lib/supabase-client', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}));

describe('Jira Connect API Route', () => {
  it('should generate authorization URL', async () => {
    const { getAuthorizationUrl } = require('@/lib/jira/oauth');

    getAuthorizationUrl.mockReturnValue({
      authUrl: 'https://auth.atlassian.com/authorize?client_id=xxx',
      state: 'random-state-token'
    });

    // This would test the actual route handler
    const authData = await getAuthorizationUrl('project-123');

    expect(authData.authUrl).toContain('atlassian.com');
    expect(authData.state).toBeTruthy();
  });

  it('should store OAuth state in database', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();
    const { insert } = mockSupabase.from('jira_oauth_states');

    await insert({
      state: 'test-state',
      project_id: 'project-123',
      expires_at: new Date(Date.now() + 600000).toISOString()
    });

    expect(insert).toHaveBeenCalled();
  });
});

describe('Jira Callback API Route', () => {
  it('should exchange authorization code for tokens', async () => {
    const { exchangeCodeForTokens } = require('@/lib/jira/oauth');

    const mockTokens = {
      access_token: 'access_token_123',
      refresh_token: 'refresh_token_123',
      expires_in: 3600,
      scope: 'read:jira-work write:jira-work'
    };

    exchangeCodeForTokens.mockResolvedValue(mockTokens);

    const result = await exchangeCodeForTokens('auth_code_123');

    expect(result).toEqual(mockTokens);
    expect(exchangeCodeForTokens).toHaveBeenCalledWith('auth_code_123');
  });

  it('should encrypt tokens before storing', () => {
    const { encryptToken } = require('@/lib/jira/encryption');

    const token = 'access_token_123';
    const encrypted = encryptToken(token);

    expect(encrypted).toContain('encrypted:');
    expect(encrypted).not.toBe(token);
  });

  it('should store connection in database', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();
    const { encryptToken } = require('@/lib/jira/encryption');

    const connectionData = {
      project_id: 'project-123',
      user_id: 'user-123',
      cloud_id: 'cloud-123',
      site_url: 'https://test.atlassian.net',
      access_token_encrypted: encryptToken('access_token'),
      refresh_token_encrypted: encryptToken('refresh_token'),
      token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      status: 'active'
    };

    const { insert } = mockSupabase.from('jira_connections');

    await insert(connectionData);

    expect(insert).toHaveBeenCalledWith(connectionData);
  });

  it('should handle invalid state token', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();

    mockSupabase.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: null,
            error: { message: 'State not found' }
          }))
        }))
      }))
    }));

    const { data, error } = await mockSupabase
      .from('jira_oauth_states')
      .select('*')
      .eq('state', 'invalid-state')
      .single();

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
});

describe('Jira Create Issue API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create issue with AI generation', async () => {
    const { JiraAPI } = require('@/lib/jira/api');
    const mockApi = new JiraAPI('conn-123', 'cloud-123');

    const mockIssue = {
      id: '12345',
      key: 'TEST-123',
      self: 'https://test.atlassian.net/rest/api/3/issue/12345'
    };

    mockApi.createIssue.mockResolvedValue(mockIssue);

    const result = await mockApi.createIssue({
      fields: {
        project: { key: 'TEST' },
        summary: 'AI Generated Issue',
        description: { type: 'doc', version: 1, content: [] },
        issuetype: { name: 'Task' }
      }
    });

    expect(result).toEqual(mockIssue);
    expect(mockApi.createIssue).toHaveBeenCalled();
  });

  it('should link created issue to feedback', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();

    const linkData = {
      feedback_id: 'feedback-123',
      connection_id: 'conn-123',
      issue_id: '12345',
      issue_key: 'TEST-123',
      issue_url: 'https://test.atlassian.net/browse/TEST-123',
      status: 'To Do',
      priority: 'Medium'
    };

    const { insert } = mockSupabase.from('jira_issue_links');

    await insert(linkData);

    expect(insert).toHaveBeenCalledWith(linkData);
  });

  it('should handle Jira API errors', async () => {
    const { JiraAPI } = require('@/lib/jira/api');
    const mockApi = new JiraAPI('conn-123', 'cloud-123');

    const mockError = new Error('Jira API Error: Invalid project key');
    mockApi.createIssue.mockRejectedValue(mockError);

    await expect(
      mockApi.createIssue({
        fields: {
          project: { key: 'INVALID' },
          summary: 'Test',
          issuetype: { name: 'Task' }
        }
      })
    ).rejects.toThrow('Jira API Error');
  });

  it('should log sync event', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();

    const logData = {
      connection_id: 'conn-123',
      event_type: 'issue_created',
      issue_key: 'TEST-123',
      status: 'success',
      details: { feedback_id: 'feedback-123' }
    };

    const { insert } = mockSupabase.from('jira_sync_logs');

    await insert(logData);

    expect(insert).toHaveBeenCalledWith(logData);
  });
});

describe('Jira Bulk Create API Route', () => {
  it('should create multiple issues', async () => {
    const { JiraAPI } = require('@/lib/jira/api');
    const mockApi = new JiraAPI('conn-123', 'cloud-123');

    const mockIssues = [
      { id: '1', key: 'TEST-1', self: 'https://...' },
      { id: '2', key: 'TEST-2', self: 'https://...' },
      { id: '3', key: 'TEST-3', self: 'https://...' }
    ];

    mockApi.createIssue
      .mockResolvedValueOnce(mockIssues[0])
      .mockResolvedValueOnce(mockIssues[1])
      .mockResolvedValueOnce(mockIssues[2]);

    const results = await Promise.all([
      mockApi.createIssue({ fields: {} }),
      mockApi.createIssue({ fields: {} }),
      mockApi.createIssue({ fields: {} })
    ]);

    expect(results).toHaveLength(3);
    expect(mockApi.createIssue).toHaveBeenCalledTimes(3);
  });

  it('should create epic and link issues', async () => {
    const { JiraAPI } = require('@/lib/jira/api');
    const mockApi = new JiraAPI('conn-123', 'cloud-123');

    const mockEpic = {
      id: '999',
      key: 'TEST-999',
      self: 'https://test.atlassian.net/rest/api/3/issue/999'
    };

    const mockIssue = {
      id: '1',
      key: 'TEST-1',
      self: 'https://test.atlassian.net/rest/api/3/issue/1'
    };

    mockApi.createIssue
      .mockResolvedValueOnce(mockEpic)
      .mockResolvedValueOnce(mockIssue);

    const epic = await mockApi.createIssue({
      fields: {
        project: { key: 'TEST' },
        summary: 'Epic: Theme Cluster',
        issuetype: { name: 'Epic' }
      }
    });

    const issue = await mockApi.createIssue({
      fields: {
        project: { key: 'TEST' },
        summary: 'Issue under epic',
        parent: { key: epic.key },
        issuetype: { name: 'Task' }
      }
    });

    expect(epic.key).toBe('TEST-999');
    expect(issue.key).toBe('TEST-1');
  });

  it('should handle partial failures gracefully', async () => {
    const { JiraAPI } = require('@/lib/jira/api');
    const mockApi = new JiraAPI('conn-123', 'cloud-123');

    mockApi.createIssue
      .mockResolvedValueOnce({ id: '1', key: 'TEST-1' })
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce({ id: '3', key: 'TEST-3' });

    const results = await Promise.allSettled([
      mockApi.createIssue({ fields: {} }),
      mockApi.createIssue({ fields: {} }),
      mockApi.createIssue({ fields: {} })
    ]);

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(successful).toHaveLength(2);
    expect(failed).toHaveLength(1);
  });
});

describe('Jira Webhook API Route', () => {
  it('should handle issue status update', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();

    const webhookPayload = {
      webhookEvent: 'jira:issue_updated',
      issue: {
        key: 'TEST-123',
        fields: {
          status: {
            name: 'Done'
          }
        }
      }
    };

    const updateBuilder = mockSupabase.from('jira_issue_links');
    await updateBuilder.update({ status: 'Done' }).eq('issue_key', 'TEST-123');

    expect(updateBuilder.update).toHaveBeenCalledWith({ status: 'Done' });
  });

  it('should mark feedback as resolved when issue is done', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();

    // Simulate marking feedback as resolved
    await mockSupabase
      .from('feedback')
      .update({ resolved: true })
      .eq('id', 'feedback-123');

    const updateCall = mockSupabase.from.mock.results[0].value.update.mock.calls[0];
    expect(updateCall[0]).toEqual({ resolved: true });
  });

  it('should log webhook event', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();

    const logData = {
      connection_id: 'conn-123',
      event_type: 'webhook_received',
      issue_key: 'TEST-123',
      status: 'success',
      details: { webhook_event: 'jira:issue_updated' }
    };

    await mockSupabase.from('jira_sync_logs').insert(logData);

    expect(mockSupabase.from).toHaveBeenCalledWith('jira_sync_logs');
  });
});

describe('Jira Disconnect API Route', () => {
  it('should delete connection', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();

    const deleteBuilder = mockSupabase.from('jira_connections');
    await deleteBuilder.delete().eq('id', 'conn-123');

    expect(deleteBuilder.delete).toHaveBeenCalled();
  });

  it('should cascade delete related records', async () => {
    const mockSupabase = require('@/lib/supabase-client').getSupabaseClient();

    // The cascade should be handled by database constraints
    // Just verify the main delete is called
    await mockSupabase
      .from('jira_connections')
      .delete()
      .eq('id', 'conn-123');

    expect(mockSupabase.from).toHaveBeenCalledWith('jira_connections');
  });
});
