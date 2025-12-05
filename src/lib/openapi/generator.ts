/**
 * OpenAPI Spec Generator
 * Generates the complete OpenAPI specification for SignalsLoop API
 */

import type { OpenAPISpec, OpenAPIPathItem } from './schema';
import { COMMON_SCHEMAS } from './schema';

const API_VERSION = '1.0.0';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.signalsloop.com';

/**
 * Generate the complete OpenAPI specification
 */
export function generateOpenAPISpec(): OpenAPISpec {
  return {
    openapi: '3.0.3',
    info: {
      title: 'SignalsLoop API',
      description: `
# SignalsLoop API

The SignalsLoop API enables you to programmatically access your product feedback intelligence platform.

## Authentication

All API requests require authentication using a Bearer token. You can generate API keys in your project settings.

\`\`\`
Authorization: Bearer <your-api-key>
\`\`\`

## Rate Limiting

- Free tier: 100 requests/minute
- Pro tier: 1000 requests/minute
- Enterprise: Custom limits

## Webhooks

SignalsLoop supports webhooks for real-time notifications. Configure webhooks in your project settings.

## SDKs

- JavaScript/TypeScript: \`npm install @signalsloop/sdk\`
- Python: \`pip install signalsloop\`
      `.trim(),
      version: API_VERSION,
      contact: {
        name: 'SignalsLoop Support',
        email: 'support@signalsloop.com',
        url: 'https://signalsloop.com/docs',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `${BASE_URL}/api/v1`,
        description: 'Production API',
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Local development',
      },
    ],
    tags: [
      { name: 'Projects', description: 'Project management' },
      { name: 'Feedback', description: 'Feedback CRUD operations' },
      { name: 'Specs', description: 'AI-powered specification management' },
      { name: 'Dashboard', description: 'Mission Control dashboard data' },
      { name: 'Themes', description: 'Feedback theme analysis' },
      { name: 'Competitive', description: 'Competitive intelligence' },
      { name: 'Ask', description: 'Natural language queries' },
      { name: 'Roadmap', description: 'Roadmap management' },
      { name: 'Analytics', description: 'Analytics and metrics' },
      { name: 'Webhooks', description: 'Webhook management' },
    ],
    paths: {
      ...projectPaths(),
      ...feedbackPaths(),
      ...specsPaths(),
      ...dashboardPaths(),
      ...themesPaths(),
      ...competitivePaths(),
      ...askPaths(),
      ...roadmapPaths(),
    },
    components: {
      schemas: COMMON_SCHEMAS,
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'API key authentication',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API key in header',
        },
      },
    },
    security: [
      { BearerAuth: [] },
      { ApiKeyAuth: [] },
    ],
  };
}

// === Path Definitions ===

function projectPaths(): Record<string, OpenAPIPathItem> {
  return {
    '/projects': {
      get: {
        operationId: 'listProjects',
        summary: 'List all projects',
        description: 'Returns a list of all projects accessible to the authenticated user',
        tags: ['Projects'],
        responses: {
          '200': {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    projects: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Project' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createProject',
        summary: 'Create a new project',
        tags: ['Projects'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Project name' },
                  description: { type: 'string', description: 'Project description' },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Project created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
              },
            },
          },
        },
      },
    },
    '/projects/{projectId}': {
      get: {
        operationId: 'getProject',
        summary: 'Get project details',
        tags: ['Projects'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Project details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
              },
            },
          },
          '404': {
            description: 'Project not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  };
}

function feedbackPaths(): Record<string, OpenAPIPathItem> {
  return {
    '/projects/{projectId}/feedback': {
      get: {
        operationId: 'listFeedback',
        summary: 'List feedback',
        description: 'Returns paginated feedback for a project',
        tags: ['Feedback'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 },
          },
          {
            name: 'category',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['feature_request', 'bug', 'question', 'praise', 'other'],
            },
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['open', 'under_review', 'planned', 'in_progress', 'completed', 'closed'],
            },
          },
        ],
        responses: {
          '200': {
            description: 'Feedback list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    feedback: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Feedback' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createFeedback',
        summary: 'Submit new feedback',
        tags: ['Feedback'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  category: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
                required: ['title'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Feedback created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Feedback' },
              },
            },
          },
        },
      },
    },
    '/projects/{projectId}/feedback/{feedbackId}': {
      get: {
        operationId: 'getFeedback',
        summary: 'Get feedback details',
        tags: ['Feedback'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
          {
            name: 'feedbackId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Feedback details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Feedback' },
              },
            },
          },
        },
      },
      patch: {
        operationId: 'updateFeedback',
        summary: 'Update feedback',
        tags: ['Feedback'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
          {
            name: 'feedbackId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  status: { type: 'string' },
                  category: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Feedback updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Feedback' },
              },
            },
          },
        },
      },
    },
  };
}

function specsPaths(): Record<string, OpenAPIPathItem> {
  return {
    '/projects/{projectId}/specs': {
      get: {
        operationId: 'listSpecs',
        summary: 'List specs',
        tags: ['Specs'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Specs list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    specs: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Spec' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/projects/{projectId}/specs/generate': {
      post: {
        operationId: 'generateSpec',
        summary: 'Generate spec with AI',
        description: 'Uses RAG to generate a comprehensive spec based on your input',
        tags: ['Specs'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  prompt: { type: 'string', description: 'Feature description or idea' },
                  template: {
                    type: 'string',
                    enum: ['standard', 'feature_launch', 'bug_fix', 'api'],
                  },
                  contextSources: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'IDs of past specs or themes to use as context',
                  },
                },
                required: ['prompt'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Generated spec (streamed)',
            content: {
              'text/event-stream': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
  };
}

function dashboardPaths(): Record<string, OpenAPIPathItem> {
  return {
    '/projects/{projectId}/dashboard/briefing': {
      get: {
        operationId: 'getDailyBriefing',
        summary: 'Get daily AI briefing',
        description: 'Returns today\'s AI-generated briefing or creates one if it doesn\'t exist',
        tags: ['Dashboard'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Daily briefing',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyBriefing' },
              },
            },
          },
        },
      },
      post: {
        operationId: 'regenerateBriefing',
        summary: 'Regenerate daily briefing',
        tags: ['Dashboard'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Regenerated briefing',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyBriefing' },
              },
            },
          },
        },
      },
    },
    '/projects/{projectId}/dashboard/anomalies': {
      get: {
        operationId: 'getAnomalies',
        summary: 'Get detected anomalies',
        tags: ['Dashboard'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Anomalies list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    anomalies: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Anomaly' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function themesPaths(): Record<string, OpenAPIPathItem> {
  return {
    '/projects/{projectId}/themes': {
      get: {
        operationId: 'listThemes',
        summary: 'List feedback themes',
        tags: ['Themes'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Themes list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    themes: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Theme' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function competitivePaths(): Record<string, OpenAPIPathItem> {
  return {
    '/projects/{projectId}/competitive/competitors': {
      get: {
        operationId: 'listCompetitors',
        summary: 'List tracked competitors',
        tags: ['Competitive'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Competitors list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    competitors: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Competitor' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/projects/{projectId}/competitive/insights': {
      get: {
        operationId: 'getCompetitiveInsights',
        summary: 'Get AI competitive insights',
        tags: ['Competitive'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Competitive insights',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    featureGaps: { type: 'array', items: { type: 'object' } },
                    threats: { type: 'array', items: { type: 'object' } },
                    opportunities: { type: 'array', items: { type: 'object' } },
                    recommendations: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function askPaths(): Record<string, OpenAPIPathItem> {
  return {
    '/projects/{projectId}/ask': {
      post: {
        operationId: 'askQuery',
        summary: 'Ask a natural language question',
        description: 'Query your feedback data using natural language',
        tags: ['Ask'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Natural language question' },
                  role: {
                    type: 'string',
                    enum: ['ceo', 'product', 'engineering', 'sales', 'marketing', 'cs'],
                    description: 'Stakeholder role for context',
                  },
                },
                required: ['query'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Query response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    answer: { type: 'string' },
                    sources: { type: 'array', items: { type: 'object' } },
                    suggestedActions: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function roadmapPaths(): Record<string, OpenAPIPathItem> {
  return {
    '/projects/{projectId}/roadmap': {
      get: {
        operationId: 'getRoadmap',
        summary: 'Get roadmap items',
        tags: ['Roadmap'],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
          },
        ],
        responses: {
          '200': {
            description: 'Roadmap items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
