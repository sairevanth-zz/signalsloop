/**
 * Export Utilities for Specs
 */

import type {
  Spec,
  JiraExportConfig,
  JiraExportResult,
  MarkdownExportOptions,
} from '@/types/specs';

// ============================================================================
// Markdown Export
// ============================================================================

/**
 * Export spec as markdown with optional metadata
 */
export function exportAsMarkdown(spec: Spec, options?: MarkdownExportOptions): string {
  let markdown = '';

  // Add metadata header if requested
  if (options?.includeMetadata) {
    markdown += `---\n`;
    markdown += `title: ${spec.title}\n`;
    markdown += `status: ${spec.status}\n`;
    markdown += `template: ${spec.template}\n`;
    markdown += `created_at: ${new Date(spec.created_at).toISOString()}\n`;
    markdown += `updated_at: ${new Date(spec.updated_at).toISOString()}\n`;
    if (spec.published_at) {
      markdown += `published_at: ${new Date(spec.published_at).toISOString()}\n`;
    }
    markdown += `---\n\n`;
  }

  // Add main content
  markdown += spec.content;

  // Add linked feedback section if requested
  if (options?.includeLinkedFeedback && spec.linked_feedback_ids.length > 0) {
    markdown += `\n\n---\n\n`;
    markdown += `## Linked Feedback\n\n`;
    markdown += `This spec addresses ${spec.linked_feedback_ids.length} feedback item(s):\n`;
    spec.linked_feedback_ids.forEach((id, index) => {
      markdown += `${index + 1}. Feedback ID: ${id}\n`;
    });
  }

  // Add context sources if requested
  if (options?.includeContextSources && spec.context_sources.length > 0) {
    markdown += `\n\n---\n\n`;
    markdown += `## Context Sources Used\n\n`;
    markdown += `This spec was generated using the following context sources:\n\n`;

    const groupedSources = spec.context_sources.reduce((acc, source) => {
      if (!acc[source.type]) {
        acc[source.type] = [];
      }
      acc[source.type].push(source);
      return acc;
    }, {} as Record<string, typeof spec.context_sources>);

    Object.entries(groupedSources).forEach(([type, sources]) => {
      markdown += `### ${formatSourceType(type)}\n\n`;
      sources.forEach((source) => {
        markdown += `- **${source.title}** (${Math.round(source.relevanceScore * 100)}% relevant)\n`;
        if (source.preview) {
          markdown += `  > ${source.preview}\n`;
        }
      });
      markdown += '\n';
    });
  }

  // Add generation metadata footer
  markdown += `\n\n---\n\n`;
  markdown += `_Generated with ${spec.generation_model}`;
  if (spec.generation_time_ms) {
    markdown += ` in ${(spec.generation_time_ms / 1000).toFixed(1)}s`;
  }
  markdown += `_\n`;

  return markdown;
}

/**
 * Format source type for display
 */
function formatSourceType(type: string): string {
  const typeMap: Record<string, string> = {
    past_spec: 'Past Specs',
    feedback: 'User Feedback',
    competitor: 'Competitor Analysis',
    persona: 'User Personas',
  };

  return typeMap[type] || type;
}

// ============================================================================
// Jira Export
// ============================================================================

/**
 * Export spec to Jira
 */
export async function exportToJira(
  spec: Spec,
  config: JiraExportConfig
): Promise<JiraExportResult> {
  try {
    // Convert markdown to Jira ADF (Atlassian Document Format)
    const description = await convertMarkdownToADF(spec.content);

    // Prepare Jira issue data
    const issueData = {
      fields: {
        project: {
          key: config.project_key,
        },
        summary: spec.title,
        description: config.use_ai_formatting ? description : spec.content,
        issuetype: {
          name: config.issue_type,
        },
        ...(config.epic_key && {
          parent: {
            key: config.epic_key,
          },
        }),
        ...(config.components && config.components.length > 0 && {
          components: config.components.map((name) => ({ name })),
        }),
        ...(config.fix_versions && config.fix_versions.length > 0 && {
          fixVersions: config.fix_versions.map((name) => ({ name })),
        }),
      },
    };

    // Make API call to create Jira issue
    const response = await fetch('/api/integrations/jira/create-issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectionId: config.connection_id,
        issueData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create Jira issue');
    }

    const result = await response.json();

    return {
      success: true,
      issue_key: result.key,
      issue_id: result.id,
      issue_url: `${result.self}`,
    };
  } catch (error) {
    console.error('Error exporting to Jira:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convert Markdown to Jira ADF format
 */
async function convertMarkdownToADF(markdown: string): Promise<any> {
  // This is a simplified conversion
  // In production, use a proper markdown-to-ADF library like @atlaskit/adf-utils

  const lines = markdown.split('\n');
  const content: any[] = [];

  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: currentParagraph.join(' '),
          },
        ],
      });
      currentParagraph = [];
    }
  };

  lines.forEach((line) => {
    // Headings
    if (line.startsWith('# ')) {
      flushParagraph();
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: line.substring(2) }],
      });
    } else if (line.startsWith('## ')) {
      flushParagraph();
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: line.substring(3) }],
      });
    } else if (line.startsWith('### ')) {
      flushParagraph();
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: line.substring(4) }],
      });
    }
    // Bullet lists
    else if (line.match(/^[\-\*]\s/)) {
      flushParagraph();
      content.push({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: line.substring(2) }],
              },
            ],
          },
        ],
      });
    }
    // Empty lines
    else if (line.trim() === '') {
      flushParagraph();
    }
    // Regular paragraphs
    else {
      currentParagraph.push(line);
    }
  });

  flushParagraph();

  return {
    version: 1,
    type: 'doc',
    content,
  };
}

// ============================================================================
// Clipboard Export
// ============================================================================

/**
 * Prepare spec for clipboard copy
 */
export function prepareForClipboard(spec: Spec): string {
  return exportAsMarkdown(spec, {
    includeMetadata: true,
    includeLinkedFeedback: true,
    includeContextSources: false, // Skip context sources for clipboard
  });
}

// ============================================================================
// Share Link Generation
// ============================================================================

/**
 * Generate a shareable link for the spec
 */
export function generateShareLink(specId: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/dashboard/specs/${specId}`;
}

// ============================================================================
// File Download Helpers
// ============================================================================

/**
 * Trigger download of markdown file
 */
export function downloadMarkdown(spec: Spec, options?: MarkdownExportOptions): void {
  const markdown = exportAsMarkdown(spec, options);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(spec.title)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sanitize filename for download
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}
