/**
 * Linear GraphQL API Client
 * 
 * Provides type-safe wrapper around Linear's GraphQL API.
 * Handles authentication and common operations.
 */

const LINEAR_API_URL = 'https://api.linear.app/graphql';

export interface LinearIssue {
    id: string;
    identifier: string;
    title: string;
    description?: string;
    state: {
        id: string;
        name: string;
        type: string;
    };
    priority: number;
    url: string;
    team: {
        id: string;
        name: string;
        key: string;
    };
    labels?: {
        nodes: Array<{ id: string; name: string }>;
    };
    createdAt: string;
    updatedAt: string;
}

export interface LinearComment {
    id: string;
    body: string;
    user?: {
        id: string;
        name: string;
        email?: string;
    };
    issue: {
        id: string;
        identifier: string;
        title: string;
    };
    createdAt: string;
}

export interface LinearTeam {
    id: string;
    name: string;
    key: string;
}

/**
 * Linear API Client
 */
export class LinearAPI {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    /**
     * Execute a GraphQL query/mutation
     */
    private async query<T>(
        operation: string,
        variables?: Record<string, any>
    ): Promise<T> {
        const response = await fetch(LINEAR_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.accessToken,
            },
            body: JSON.stringify({
                query: operation,
                variables,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Linear API error: ${response.status} - ${error}`);
        }

        const json = await response.json();

        if (json.errors && json.errors.length > 0) {
            throw new Error(`Linear GraphQL error: ${json.errors[0].message}`);
        }

        return json.data;
    }

    /**
     * Get an issue by ID or identifier
     */
    async getIssue(issueId: string): Promise<LinearIssue | null> {
        const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          description
          state {
            id
            name
            type
          }
          priority
          url
          team {
            id
            name
            key
          }
          labels {
            nodes {
              id
              name
            }
          }
          createdAt
          updatedAt
        }
      }
    `;

        const data = await this.query<{ issue: LinearIssue | null }>(query, { id: issueId });
        return data.issue;
    }

    /**
     * Get teams the authenticated user has access to
     */
    async getTeams(): Promise<LinearTeam[]> {
        const query = `
      query GetTeams {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `;

        const data = await this.query<{ teams: { nodes: LinearTeam[] } }>(query);
        return data.teams.nodes;
    }

    /**
     * Add a comment to an issue
     */
    async addComment(issueId: string, body: string): Promise<{ success: boolean; comment?: any }> {
        const mutation = `
      mutation CreateComment($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          success
          comment {
            id
            body
            createdAt
          }
        }
      }
    `;

        const data = await this.query<{ commentCreate: { success: boolean; comment?: any } }>(
            mutation,
            { issueId, body }
        );
        return data.commentCreate;
    }

    /**
     * Search issues by text
     */
    async searchIssues(searchText: string, limit = 10): Promise<LinearIssue[]> {
        const query = `
      query SearchIssues($search: String!, $limit: Int!) {
        issueSearch(first: $limit, query: $search) {
          nodes {
            id
            identifier
            title
            description
            state {
              id
              name
              type
            }
            priority
            url
            team {
              id
              name
              key
            }
            createdAt
            updatedAt
          }
        }
      }
    `;

        const data = await this.query<{ issueSearch: { nodes: LinearIssue[] } }>(
            query,
            { search: searchText, limit }
        );
        return data.issueSearch.nodes;
    }

    /**
     * Update issue state
     */
    async updateIssueState(issueId: string, stateId: string): Promise<boolean> {
        const mutation = `
      mutation UpdateIssue($issueId: String!, $stateId: String!) {
        issueUpdate(id: $issueId, input: { stateId: $stateId }) {
          success
        }
      }
    `;

        const data = await this.query<{ issueUpdate: { success: boolean } }>(
            mutation,
            { issueId, stateId }
        );
        return data.issueUpdate.success;
    }
}
