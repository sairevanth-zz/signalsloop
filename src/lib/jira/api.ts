/**
 * Jira REST API Client
 *
 * Provides a type-safe wrapper around Jira Cloud REST API v3.
 * Handles authentication, request formatting, and error handling.
 */

import { getValidAccessToken } from './oauth';

/**
 * Atlassian Document Format (ADF) for rich text content
 */
export interface ADF {
  type: 'doc';
  version: 1;
  content: ADFNode[];
}

export interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

/**
 * Jira Issue creation payload
 */
export interface CreateIssuePayload {
  project: string; // Project key (e.g., 'SLDEV')
  summary: string; // Issue title
  description: ADF; // Description in ADF format
  issuetype: string; // Issue type name (e.g., 'Bug', 'Story', 'Task')
  priority?: string; // Priority name (e.g., 'High', 'Medium', 'Low')
  labels?: string[]; // Labels array
  assignee?: string; // Assignee account ID
  components?: string[]; // Component names
  customFields?: Record<string, any>; // Custom field values
}

/**
 * Jira Issue response
 */
export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: ADF;
    status: {
      name: string;
      id: string;
      statusCategory: {
        key: string;
        name: string;
      };
    };
    priority?: {
      name: string;
      id: string;
    };
    issuetype: {
      name: string;
      id: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress?: string;
      avatarUrls?: Record<string, string>;
    };
    labels: string[];
    created: string;
    updated: string;
    [key: string]: any;
  };
}

/**
 * Jira Project response
 */
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls?: Record<string, string>;
  issueTypes?: JiraIssueType[];
}

/**
 * Jira Board (Agile)
 */
export interface JiraBoard {
  id: number;
  name: string;
  type?: string;
  location?: Record<string, any>;
}

/**
 * Jira Issue Type
 */
export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  subtask: boolean;
  iconUrl?: string;
}

/**
 * Jira Priority
 */
export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

/**
 * Jira User
 */
export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  active: boolean;
}

/**
 * Jira Velocity report (Agile API)
 */
export interface JiraVelocityReport {
  sprints: Array<{
    id: number;
    name: string;
    startDate?: string;
    endDate?: string;
    completeDate?: string;
    state?: string;
  }>;
  velocityStatEntries: Record<
    string,
    {
      estimated?: { value?: number };
      completed?: { value?: number };
    }
  >;
}

/**
 * Jira Webhook creation payload
 */
export interface CreateWebhookPayload {
  name: string;
  url: string;
  events: string[];
  filters?: {
    'issue-related-events-section'?: string;
  };
}

/**
 * Jira API Client
 *
 * Handles all Jira REST API interactions with automatic token refresh.
 */
export class JiraAPI {
  private connectionId: string;
  private cloudId: string;
  private baseUrl: string;

  constructor(connectionId: string, cloudId: string) {
    this.connectionId = connectionId;
    this.cloudId = cloudId;
    this.baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}`;
  }

  /**
   * Makes an authenticated request to the Jira API.
   *
   * @param endpoint - API endpoint (e.g., '/rest/api/3/project')
   * @param options - Fetch options
   * @returns Response JSON
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Get valid access token (automatically refreshes if needed)
    const accessToken = await getValidAccessToken(this.connectionId);

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Jira API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.errorMessages?.join(', ') || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * Get board metadata
   */
  async getBoard(boardId: string): Promise<{ id: number; name: string }> {
    return this.request(`/rest/agile/1.0/board/${boardId}`);
  }

  /**
   * Get sprint velocity report for a board
   */
  async getBoardVelocity(boardId: string): Promise<JiraVelocityReport> {
    return this.request(`/rest/agile/1.0/board/${boardId}/velocity`);
  }

  /**
   * List boards (paginated)
   */
  async listBoards(params: { startAt?: number; maxResults?: number } = {}): Promise<{
    startAt: number;
    maxResults: number;
    isLast: boolean;
    values: JiraBoard[];
  }> {
    const { startAt = 0, maxResults = 50 } = params;
    return this.request(
      `/rest/agile/1.0/board?startAt=${startAt}&maxResults=${maxResults}`
    );
  }

  // ============================================================================
  // PROJECT ENDPOINTS
  // ============================================================================

  /**
   * Gets all projects accessible by the user.
   *
   * @returns Array of Jira projects
   */
  async getProjects(): Promise<JiraProject[]> {
    return this.request<JiraProject[]>('/rest/api/3/project');
  }

  /**
   * Gets a single project by key or ID.
   *
   * @param projectKeyOrId - Project key (e.g., 'SLDEV') or ID
   * @returns Project details
   */
  async getProject(projectKeyOrId: string): Promise<JiraProject> {
    return this.request<JiraProject>(`/rest/api/3/project/${projectKeyOrId}`);
  }

  /**
   * Gets issue types for a project.
   *
   * @param projectKey - Project key
   * @returns Array of issue types
   */
  async getIssueTypes(projectKey: string): Promise<JiraIssueType[]> {
    const project = await this.getProject(projectKey);
    return project.issueTypes || [];
  }

  // ============================================================================
  // ISSUE ENDPOINTS
  // ============================================================================

  /**
   * Creates a new issue in Jira.
   *
   * @param issueData - Issue creation data
   * @returns Created issue
   */
  async createIssue(issueData: CreateIssuePayload): Promise<JiraIssue> {
    const payload: any = {
      fields: {
        project: { key: issueData.project },
        summary: issueData.summary,
        description: issueData.description,
        issuetype: { name: issueData.issuetype }
      }
    };

    // Add optional fields
    if (issueData.priority) {
      payload.fields.priority = { name: issueData.priority };
    }

    if (issueData.labels && issueData.labels.length > 0) {
      payload.fields.labels = issueData.labels;
    }

    if (issueData.assignee) {
      payload.fields.assignee = { id: issueData.assignee };
    }

    if (issueData.components && issueData.components.length > 0) {
      payload.fields.components = issueData.components.map((name: string) => ({ name }));
    }

    // Add custom fields
    if (issueData.customFields) {
      Object.assign(payload.fields, issueData.customFields);
    }

    return this.request<JiraIssue>('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Gets an issue by key or ID.
   *
   * @param issueKeyOrId - Issue key (e.g., 'SLDEV-123') or ID
   * @returns Issue details
   */
  async getIssue(issueKeyOrId: string): Promise<JiraIssue> {
    return this.request<JiraIssue>(`/rest/api/3/issue/${issueKeyOrId}`);
  }

  /**
   * Updates an existing issue.
   *
   * @param issueKeyOrId - Issue key or ID
   * @param update - Fields to update
   */
  async updateIssue(
    issueKeyOrId: string,
    update: Partial<CreateIssuePayload>
  ): Promise<void> {
    const payload: any = { fields: {} };

    if (update.summary) {
      payload.fields.summary = update.summary;
    }

    if (update.description) {
      payload.fields.description = update.description;
    }

    if (update.priority) {
      payload.fields.priority = { name: update.priority };
    }

    if (update.labels) {
      payload.fields.labels = update.labels;
    }

    if (update.assignee) {
      payload.fields.assignee = { id: update.assignee };
    }

    await this.request(`/rest/api/3/issue/${issueKeyOrId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Deletes an issue.
   *
   * @param issueKeyOrId - Issue key or ID
   */
  async deleteIssue(issueKeyOrId: string): Promise<void> {
    await this.request(`/rest/api/3/issue/${issueKeyOrId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Adds a comment to an issue.
   *
   * @param issueKeyOrId - Issue key or ID
   * @param comment - Comment text (plain text, will be converted to ADF)
   * @returns Created comment
   */
  async addComment(issueKeyOrId: string, comment: string): Promise<any> {
    return this.request(`/rest/api/3/issue/${issueKeyOrId}/comment`, {
      method: 'POST',
      body: JSON.stringify({
        body: textToADF(comment)
      })
    });
  }

  /**
   * Transitions an issue to a new status.
   *
   * @param issueKeyOrId - Issue key or ID
   * @param transitionId - Transition ID (get from getTransitions)
   */
  async transitionIssue(issueKeyOrId: string, transitionId: string): Promise<void> {
    await this.request(`/rest/api/3/issue/${issueKeyOrId}/transitions`, {
      method: 'POST',
      body: JSON.stringify({
        transition: { id: transitionId }
      })
    });
  }

  /**
   * Gets available transitions for an issue.
   *
   * @param issueKeyOrId - Issue key or ID
   * @returns Available transitions
   */
  async getTransitions(issueKeyOrId: string): Promise<any[]> {
    const response = await this.request<{ transitions: any[] }>(
      `/rest/api/3/issue/${issueKeyOrId}/transitions`
    );
    return response.transitions;
  }

  // ============================================================================
  // SEARCH ENDPOINTS
  // ============================================================================

  /**
   * Searches for issues using JQL (Jira Query Language).
   *
   * @param jql - JQL query string
   * @param options - Search options (fields, maxResults, startAt)
   * @returns Search results
   */
  async searchIssues(
    jql: string,
    options: {
      fields?: string[];
      maxResults?: number;
      startAt?: number;
    } = {}
  ): Promise<{ issues: JiraIssue[]; total: number; maxResults: number; startAt: number }> {
    const params = new URLSearchParams({
      jql,
      maxResults: (options.maxResults || 50).toString(),
      startAt: (options.startAt || 0).toString()
    });

    if (options.fields && options.fields.length > 0) {
      params.append('fields', options.fields.join(','));
    }

    return this.request(`/rest/api/3/search?${params.toString()}`);
  }

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  /**
   * Gets the current authenticated user.
   *
   * @returns Current user
   */
  async getCurrentUser(): Promise<JiraUser> {
    return this.request<JiraUser>('/rest/api/3/myself');
  }

  /**
   * Searches for users assignable to a project.
   *
   * @param projectKey - Project key
   * @param query - Search query
   * @returns Array of users
   */
  async searchUsers(projectKey: string, query: string = ''): Promise<JiraUser[]> {
    const params = new URLSearchParams({
      project: projectKey
    });

    if (query) {
      params.append('query', query);
    }

    return this.request<JiraUser[]>(`/rest/api/3/user/assignable/search?${params.toString()}`);
  }

  // ============================================================================
  // PRIORITY ENDPOINTS
  // ============================================================================

  /**
   * Gets all priorities.
   *
   * @returns Array of priorities
   */
  async getPriorities(): Promise<JiraPriority[]> {
    return this.request<JiraPriority[]>('/rest/api/3/priority');
  }

  // ============================================================================
  // WEBHOOK ENDPOINTS
  // ============================================================================

  /**
   * Creates a webhook in Jira.
   *
   * @param webhookData - Webhook configuration
   * @returns Created webhook
   */
  async createWebhook(webhookData: CreateWebhookPayload): Promise<any> {
    return this.request('/rest/webhooks/1.0/webhook', {
      method: 'POST',
      body: JSON.stringify(webhookData)
    });
  }

  /**
   * Gets all webhooks.
   *
   * @returns Array of webhooks
   */
  async getWebhooks(): Promise<any[]> {
    return this.request('/rest/webhooks/1.0/webhook');
  }

  /**
   * Deletes a webhook.
   *
   * @param webhookId - Webhook ID
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`/rest/webhooks/1.0/webhook/${webhookId}`, {
      method: 'DELETE'
    });
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Creates multiple issues in bulk.
   *
   * @param issues - Array of issue creation data
   * @returns Array of created issues
   */
  async createBulkIssues(issues: CreateIssuePayload[]): Promise<JiraIssue[]> {
    const payload = {
      issueUpdates: issues.map(issue => ({
        fields: {
          project: { key: issue.project },
          summary: issue.summary,
          description: issue.description,
          issuetype: { name: issue.issuetype },
          ...(issue.priority && { priority: { name: issue.priority } }),
          ...(issue.labels && { labels: issue.labels }),
          ...(issue.assignee && { assignee: { id: issue.assignee } }),
          ...(issue.customFields || {})
        }
      }))
    };

    const response = await this.request<{ issues: JiraIssue[] }>('/rest/api/3/issue/bulk', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return response.issues;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts plain text to Atlassian Document Format (ADF).
 *
 * For simple use cases. For complex formatting, use a dedicated library.
 *
 * @param text - Plain text
 * @returns ADF document
 */
export function textToADF(text: string): ADF {
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  return {
    type: 'doc',
    version: 1,
    content: paragraphs.map(para => ({
      type: 'paragraph',
      content: [{ type: 'text', text: para }]
    }))
  };
}

/**
 * Converts markdown to Atlassian Document Format (ADF).
 *
 * Basic implementation. For production, consider using a dedicated library.
 *
 * @param markdown - Markdown text
 * @returns ADF document
 */
export function markdownToADF(markdown: string): ADF {
  const content: ADFNode[] = [];
  const lines = markdown.split('\n');
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text }]
        });
      }
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Headings
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: trimmed.slice(2) }]
      });
    } else if (trimmed.startsWith('## ')) {
      flushParagraph();
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: trimmed.slice(3) }]
      });
    } else if (trimmed.startsWith('### ')) {
      flushParagraph();
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: trimmed.slice(4) }]
      });
    }
    // Bullet points
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph();
      if (content[content.length - 1]?.type !== 'bulletList') {
        content.push({
          type: 'bulletList',
          content: []
        });
      }
      content[content.length - 1].content!.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: trimmed.slice(2) }]
        }]
      });
    }
    // Code blocks
    else if (trimmed.startsWith('```')) {
      flushParagraph();
      // Skip for now - would need to handle multi-line code
    }
    // Empty lines
    else if (!trimmed) {
      flushParagraph();
    }
    // Regular text
    else {
      currentParagraph.push(trimmed);
    }
  }

  flushParagraph();

  return {
    type: 'doc',
    version: 1,
    content
  };
}

/**
 * Gets the issue URL from issue key and site URL.
 *
 * @param siteUrl - Jira site URL (e.g., 'yourcompany.atlassian.net')
 * @param issueKey - Issue key (e.g., 'SLDEV-123')
 * @returns Full issue URL
 */
export function getIssueUrl(siteUrl: string, issueKey: string): string {
  // Remove protocol if present
  const cleanUrl = siteUrl.replace(/^https?:\/\//, '');
  return `https://${cleanUrl}/browse/${issueKey}`;
}
