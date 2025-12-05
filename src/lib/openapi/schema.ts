/**
 * OpenAPI Schema Definitions
 * Type definitions and schemas for the SignalsLoop API
 */

export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  paths: Record<string, OpenAPIPathItem>;
  components: OpenAPIComponents;
  tags: OpenAPITag[];
  security?: OpenAPISecurityRequirement[];
}

export interface OpenAPIInfo {
  title: string;
  description: string;
  version: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
}

export interface OpenAPITag {
  name: string;
  description?: string;
}

export interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
}

export interface OpenAPIOperation {
  operationId: string;
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: OpenAPISecurityRequirement[];
  deprecated?: boolean;
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema: OpenAPISchema;
}

export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIMediaType {
  schema: OpenAPISchema;
  example?: unknown;
}

export interface OpenAPISchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  format?: string;
  description?: string;
  enum?: string[];
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  $ref?: string;
  nullable?: boolean;
  default?: unknown;
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
}

export interface OpenAPISecurityRequirement {
  [name: string]: string[];
}

// === Common Schemas ===

export const COMMON_SCHEMAS: Record<string, OpenAPISchema> = {
  UUID: {
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier',
  },
  DateTime: {
    type: 'string',
    format: 'date-time',
    description: 'ISO 8601 date-time',
  },
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string', description: 'Error message' },
      details: { type: 'string', description: 'Additional error details' },
      code: { type: 'string', description: 'Error code' },
    },
    required: ['error'],
  },
  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', description: 'Current page number' },
      limit: { type: 'integer', description: 'Items per page' },
      total: { type: 'integer', description: 'Total number of items' },
      totalPages: { type: 'integer', description: 'Total number of pages' },
    },
  },
  Project: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      name: { type: 'string', description: 'Project name' },
      slug: { type: 'string', description: 'URL-friendly project identifier' },
      description: { type: 'string', description: 'Project description' },
      created_at: { $ref: '#/components/schemas/DateTime' },
      owner_id: { $ref: '#/components/schemas/UUID' },
    },
    required: ['id', 'name', 'slug'],
  },
  Feedback: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      title: { type: 'string', description: 'Feedback title' },
      content: { type: 'string', description: 'Feedback content' },
      category: {
        type: 'string',
        enum: ['feature_request', 'bug', 'question', 'praise', 'other'],
      },
      status: {
        type: 'string',
        enum: ['open', 'under_review', 'planned', 'in_progress', 'completed', 'closed'],
      },
      vote_count: { type: 'integer', description: 'Number of votes' },
      sentiment_score: { type: 'number', description: 'AI sentiment score (-1 to 1)' },
      created_at: { $ref: '#/components/schemas/DateTime' },
      project_id: { $ref: '#/components/schemas/UUID' },
    },
    required: ['id', 'title', 'project_id'],
  },
  Spec: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      title: { type: 'string', description: 'Spec title' },
      content: { type: 'string', description: 'Spec content (Markdown)' },
      status: {
        type: 'string',
        enum: ['draft', 'review', 'approved', 'archived'],
      },
      template_type: {
        type: 'string',
        enum: ['standard', 'feature_launch', 'bug_fix', 'api'],
      },
      created_at: { $ref: '#/components/schemas/DateTime' },
      project_id: { $ref: '#/components/schemas/UUID' },
    },
    required: ['id', 'title', 'project_id'],
  },
  DailyBriefing: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      briefing_text: { type: 'string', description: 'AI-generated briefing text' },
      sentiment_score: { type: 'number', description: 'Overall sentiment score' },
      sentiment_trend: { type: 'string', enum: ['up', 'down', 'stable'] },
      critical_items: {
        type: 'array',
        items: { $ref: '#/components/schemas/BriefingItem' },
      },
      warning_items: {
        type: 'array',
        items: { $ref: '#/components/schemas/BriefingItem' },
      },
      created_at: { $ref: '#/components/schemas/DateTime' },
    },
  },
  BriefingItem: {
    type: 'object',
    properties: {
      severity: { type: 'string', enum: ['critical', 'warning', 'info', 'success'] },
      title: { type: 'string' },
      description: { type: 'string' },
      action: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          type: { type: 'string' },
          link: { type: 'string' },
        },
      },
    },
  },
  Theme: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      theme_name: { type: 'string', description: 'Theme name' },
      frequency: { type: 'integer', description: 'Number of related feedback items' },
      avg_sentiment: { type: 'number', description: 'Average sentiment score' },
      trend: { type: 'string', enum: ['up', 'down', 'stable'] },
      project_id: { $ref: '#/components/schemas/UUID' },
    },
    required: ['id', 'theme_name', 'project_id'],
  },
  Competitor: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      name: { type: 'string', description: 'Competitor name' },
      website: { type: 'string', description: 'Competitor website URL' },
      mention_count: { type: 'integer', description: 'Number of mentions' },
      sentiment_avg: { type: 'number', description: 'Average sentiment in mentions' },
      project_id: { $ref: '#/components/schemas/UUID' },
    },
    required: ['id', 'name', 'project_id'],
  },
  Anomaly: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      type: { type: 'string', enum: ['sentiment_spike', 'volume_spike', 'theme_emergence'] },
      severity: { type: 'string', enum: ['high', 'medium', 'low'] },
      description: { type: 'string' },
      ai_analysis: { type: 'string' },
      detected_at: { $ref: '#/components/schemas/DateTime' },
      project_id: { $ref: '#/components/schemas/UUID' },
    },
  },
};
