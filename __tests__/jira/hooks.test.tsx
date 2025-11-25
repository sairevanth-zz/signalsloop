/**
 * Unit Tests for Jira React Hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useJiraConnection, useJiraIssueLink, useCreateJiraIssue } from '@/hooks/useJira';

// Mock Supabase client
jest.mock('@/lib/supabase-client', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { access_token: 'test-access-token' } },
        error: null
      }))
    }
  }))
}));

describe('useJiraConnection', () => {
  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useJiraConnection('test-project-id'));

    expect(result.current.loading).toBe(true);
    expect(result.current.connection).toBe(null);
    expect(result.current.isConnected).toBe(false);
  });

  it('should handle empty project ID', async () => {
    const { result } = renderHook(() => useJiraConnection(''));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.connection).toBe(null);
    expect(result.current.isConnected).toBe(false);
  });

  it('should provide refetch function', () => {
    const { result } = renderHook(() => useJiraConnection('test-project-id'));

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle connection data', async () => {
    const mockConnection = {
      id: 'conn-123',
      project_id: 'test-project-id',
      cloud_id: 'cloud-123',
      site_url: 'https://test.atlassian.net',
      status: 'active',
      default_project_key: 'TEST'
    };

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve({
              data: mockConnection,
              error: null
            }))
          }))
        }))
      }))
    };

    jest.spyOn(require('@/lib/supabase-client'), 'getSupabaseClient').mockReturnValue(mockSupabase);

    const { result } = renderHook(() => useJiraConnection('test-project-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.connection).toEqual(mockConnection);
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle fetch errors gracefully', async () => {
    const mockError = new Error('Database error');

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve({
              data: null,
              error: mockError
            }))
          }))
        }))
      }))
    };

    jest.spyOn(require('@/lib/supabase-client'), 'getSupabaseClient').mockReturnValue(mockSupabase);

    const { result } = renderHook(() => useJiraConnection('test-project-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.connection).toBe(null);
  });
});

describe('useJiraIssueLink', () => {
  it('should return null when feedbackId is null', async () => {
    const { result } = renderHook(() => useJiraIssueLink(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.issueLink).toBe(null);
    expect(result.current.hasIssue).toBe(false);
  });

  it('should provide refetch function', () => {
    const { result } = renderHook(() => useJiraIssueLink('feedback-123'));

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle existing issue link', async () => {
    const mockIssueLink = {
      id: 'link-123',
      feedback_id: 'feedback-123',
      issue_id: 'JIRA-123',
      issue_key: 'TEST-123',
      issue_url: 'https://test.atlassian.net/browse/TEST-123',
      status: 'To Do',
      priority: 'Medium'
    };

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve({
              data: mockIssueLink,
              error: null
            }))
          }))
        }))
      }))
    };

    jest.spyOn(require('@/lib/supabase-client'), 'getSupabaseClient').mockReturnValue(mockSupabase);

    const { result } = renderHook(() => useJiraIssueLink('feedback-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.issueLink).toEqual(mockIssueLink);
    expect(result.current.hasIssue).toBe(true);
  });
});

describe('useCreateJiraIssue', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with correct state', () => {
    const { result } = renderHook(() => useCreateJiraIssue());

    expect(result.current.creating).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.createIssue).toBe('function');
  });

  it('should handle successful issue creation', async () => {
    const mockResponse = {
      success: true,
      issueKey: 'TEST-123',
      issueUrl: 'https://test.atlassian.net/browse/TEST-123'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const { result } = renderHook(() => useCreateJiraIssue());

    const createParams = {
      feedbackId: 'feedback-123',
      feedbackContent: 'Test feedback',
      connectionId: 'conn-123',
      projectKey: 'TEST',
      useAI: true
    };

    let createdIssue;
    await waitFor(async () => {
      createdIssue = await result.current.createIssue(createParams);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/integrations/jira/create-issue',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: expect.any(String),
        }),
        body: expect.any(String)
      })
    );

    expect(createdIssue).toEqual(mockResponse);
  });

  it('should handle API errors', async () => {
    const mockError = { message: 'Failed to create issue' };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => mockError
    });

    const { result } = renderHook(() => useCreateJiraIssue());

    const createParams = {
      feedbackId: 'feedback-123',
      feedbackContent: 'Test feedback',
      connectionId: 'conn-123',
      projectKey: 'TEST',
      useAI: false
    };

    let error;
    try {
      await result.current.createIssue(createParams);
    } catch (e) {
      error = e;
    }

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should clear error on retry', async () => {
    const { result } = renderHook(() => useCreateJiraIssue());

    // Simulate error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const createParams = {
      feedbackId: 'feedback-123',
      feedbackContent: 'Test feedback',
      connectionId: 'conn-123',
      projectKey: 'TEST',
      useAI: false
    };

    try {
      await result.current.createIssue(createParams);
    } catch (e) {
      // Expected error
    }

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Retry should clear error
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await result.current.createIssue(createParams);

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });
  });
});
