/**
 * Unit Tests for Jira React Components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CreateIssueButton } from '@/components/CreateIssueButton';
import { JiraIssueBadge } from '@/components/JiraIssueBadge';
import { ConnectJiraButton } from '@/components/ConnectJiraButton';

// Mock hooks
jest.mock('@/hooks/useJira', () => ({
  useJiraConnection: jest.fn(),
  useJiraIssueLink: jest.fn(),
  useCreateJiraIssue: jest.fn()
}));

// Mock child components
jest.mock('@/components/CreateIssueModal', () => ({
  CreateIssueModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="create-issue-modal">Create Issue Modal</div> : null
  )
}));

jest.mock('@/components/JiraIssueBadge', () => ({
  JiraIssueBadge: ({ issueLink }: any) => (
    <div data-testid="jira-issue-badge">{issueLink.issue_key}</div>
  )
}));

describe('CreateIssueButton', () => {
  const mockProps = {
    feedbackId: 'feedback-123',
    feedbackContent: 'Test feedback content',
    projectId: 'project-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when Jira is not connected', () => {
    const { useJiraConnection, useJiraIssueLink } = require('@/hooks/useJira');

    useJiraConnection.mockReturnValue({
      connection: null,
      isConnected: false,
      loading: false
    });

    useJiraIssueLink.mockReturnValue({
      issueLink: null,
      hasIssue: false,
      loading: false
    });

    const { container } = render(<CreateIssueButton {...mockProps} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render button when connected but no issue exists', () => {
    const { useJiraConnection, useJiraIssueLink } = require('@/hooks/useJira');

    useJiraConnection.mockReturnValue({
      connection: {
        id: 'conn-123',
        default_project_key: 'TEST'
      },
      isConnected: true,
      loading: false
    });

    useJiraIssueLink.mockReturnValue({
      issueLink: null,
      hasIssue: false,
      loading: false,
      refetch: jest.fn()
    });

    render(<CreateIssueButton {...mockProps} />);

    expect(screen.getByText(/Create Jira Issue/i)).toBeInTheDocument();
  });

  it('should show badge when issue already exists', () => {
    const { useJiraConnection, useJiraIssueLink } = require('@/hooks/useJira');

    const mockIssueLink = {
      id: 'link-123',
      issue_key: 'TEST-123',
      issue_url: 'https://test.atlassian.net/browse/TEST-123',
      status: 'To Do'
    };

    useJiraConnection.mockReturnValue({
      connection: { id: 'conn-123' },
      isConnected: true,
      loading: false
    });

    useJiraIssueLink.mockReturnValue({
      issueLink: mockIssueLink,
      hasIssue: true,
      loading: false
    });

    render(<CreateIssueButton {...mockProps} />);

    expect(screen.getByTestId('jira-issue-badge')).toBeInTheDocument();
    expect(screen.getByText('TEST-123')).toBeInTheDocument();
  });

  it('should open modal when button is clicked', async () => {
    const { useJiraConnection, useJiraIssueLink } = require('@/hooks/useJira');

    useJiraConnection.mockReturnValue({
      connection: {
        id: 'conn-123',
        default_project_key: 'TEST'
      },
      isConnected: true,
      loading: false
    });

    useJiraIssueLink.mockReturnValue({
      issueLink: null,
      hasIssue: false,
      loading: false,
      refetch: jest.fn()
    });

    render(<CreateIssueButton {...mockProps} />);

    const button = screen.getByText(/Create Jira Issue/i);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('create-issue-modal')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    const { useJiraConnection, useJiraIssueLink } = require('@/hooks/useJira');

    useJiraConnection.mockReturnValue({
      connection: null,
      isConnected: false,
      loading: true
    });

    useJiraIssueLink.mockReturnValue({
      issueLink: null,
      hasIssue: false,
      loading: true
    });

    const { container } = render(<CreateIssueButton {...mockProps} />);

    // Should not render while loading
    expect(container).toBeEmptyDOMElement();
  });
});

describe('JiraIssueBadge', () => {
  const mockIssueLink = {
    id: 'link-123',
    issue_key: 'TEST-123',
    issue_url: 'https://test.atlassian.net/browse/TEST-123',
    status: 'In Progress',
    priority: 'High',
    assignee_name: 'John Doe',
    assignee_avatar: 'https://avatar.url'
  };

  // Use actual component for these tests
  beforeEach(() => {
    jest.unmock('@/components/JiraIssueBadge');
  });

  it('should render issue key', () => {
    const { JiraIssueBadge: ActualBadge } = jest.requireActual('@/components/JiraIssueBadge');
    render(<ActualBadge issueLink={mockIssueLink} />);

    expect(screen.getByText('TEST-123')).toBeInTheDocument();
  });

  it('should render status when showStatus is true', () => {
    const { JiraIssueBadge: ActualBadge } = jest.requireActual('@/components/JiraIssueBadge');
    render(<ActualBadge issueLink={mockIssueLink} showStatus />);

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('should render priority when showPriority is true', () => {
    const { JiraIssueBadge: ActualBadge } = jest.requireActual('@/components/JiraIssueBadge');
    render(<ActualBadge issueLink={mockIssueLink} showPriority />);

    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should render assignee when showAssignee is true', () => {
    const { JiraIssueBadge: ActualBadge } = jest.requireActual('@/components/JiraIssueBadge');
    render(<ActualBadge issueLink={mockIssueLink} showAssignee />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should open Jira URL when clicked', () => {
    const { JiraIssueBadge: ActualBadge } = jest.requireActual('@/components/JiraIssueBadge');

    // Mock window.open
    const mockOpen = jest.fn();
    global.open = mockOpen;

    render(<ActualBadge issueLink={mockIssueLink} />);

    const badge = screen.getByText('TEST-123').closest('div');
    if (badge) {
      fireEvent.click(badge);
    }

    expect(mockOpen).toHaveBeenCalledWith(mockIssueLink.issue_url, '_blank');
  });
});

describe('ConnectJiraButton', () => {
  const mockProps = {
    projectId: 'project-123',
    onSuccess: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should show connect button when not connected', () => {
    const { useJiraConnection } = require('@/hooks/useJira');

    useJiraConnection.mockReturnValue({
      connection: null,
      isConnected: false,
      loading: false
    });

    const { ConnectJiraButton: ActualButton } = jest.requireActual('@/components/ConnectJiraButton');
    render(<ActualButton {...mockProps} />);

    expect(screen.getByText(/Connect to Jira/i)).toBeInTheDocument();
  });

  it('should show connected status when connected', () => {
    const { useJiraConnection } = require('@/hooks/useJira');

    useJiraConnection.mockReturnValue({
      connection: {
        id: 'conn-123',
        site_url: 'https://test.atlassian.net',
        status: 'active'
      },
      isConnected: true,
      loading: false
    });

    const { ConnectJiraButton: ActualButton } = jest.requireActual('@/components/ConnectJiraButton');
    render(<ActualButton {...mockProps} showStatus />);

    expect(screen.getByText(/Connected/i)).toBeInTheDocument();
  });

  it('should initiate OAuth flow when clicked', async () => {
    const { useJiraConnection } = require('@/hooks/useJira');

    useJiraConnection.mockReturnValue({
      connection: null,
      isConnected: false,
      loading: false
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        authUrl: 'https://auth.atlassian.com/authorize?...'
      })
    });

    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };

    const { ConnectJiraButton: ActualButton } = jest.requireActual('@/components/ConnectJiraButton');
    render(<ActualButton {...mockProps} />);

    const button = screen.getByText(/Connect to Jira/i);
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/integrations/jira/connect',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  it('should show loading state during connection', async () => {
    const { useJiraConnection } = require('@/hooks/useJira');

    useJiraConnection.mockReturnValue({
      connection: null,
      isConnected: false,
      loading: true
    });

    const { ConnectJiraButton: ActualButton } = jest.requireActual('@/components/ConnectJiraButton');
    render(<ActualButton {...mockProps} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
