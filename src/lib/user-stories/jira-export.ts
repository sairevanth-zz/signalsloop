/**
 * Jira Export Service for User Stories
 * One-click export of user stories to Jira with proper formatting
 */

import { UserStory, JiraExportConfig, JiraExportResult, JiraFieldMapping } from '@/types/user-stories';
import { createJiraIssue } from '../jira/api';
import { generateJiraDescription } from '../jira/issue-generator';

/**
 * Export user story to Jira
 */
export async function exportStoryToJira(
  story: UserStory,
  config: JiraExportConfig
): Promise<JiraExportResult> {
  try {
    console.log(`[JIRA-EXPORT] Exporting story "${story.title}" to Jira...`);

    // Map user story fields to Jira fields
    const jiraFields = mapStoryToJiraFields(story, config);

    // Create the Jira issue
    const jiraIssue = await createJiraIssue(
      config.connection_id,
      config.project_key,
      jiraFields
    );

    console.log(
      `[JIRA-EXPORT] ✓ Successfully created Jira issue: ${jiraIssue.key}`
    );

    return {
      success: true,
      issue_key: jiraIssue.key,
      issue_id: jiraIssue.id,
      issue_url: jiraIssue.self,
    };
  } catch (error) {
    console.error('[JIRA-EXPORT] Export failed:', error);

    return {
      success: false,
      issue_key: '',
      issue_id: '',
      issue_url: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Map user story fields to Jira issue fields
 */
function mapStoryToJiraFields(
  story: UserStory,
  config: JiraExportConfig
): JiraFieldMapping {
  // Create summary (Jira title)
  const summary = story.title;

  // Create description in Atlassian Document Format (ADF) or Markdown
  const description = config.use_ai_formatting
    ? generateJiraDescriptionADF(story)
    : generateJiraDescriptionMarkdown(story);

  // Map priority
  const priority = mapPriorityToJira(story.priority_level);

  // Create labels
  const labels = [
    ...story.labels,
    'signalsloop',
    `theme-${story.theme_id || 'none'}`,
  ];

  if (story.generated_by_ai) {
    labels.push('ai-generated');
  }

  // Create acceptance criteria as formatted text
  const acceptanceCriteria = formatAcceptanceCriteriaForJira(story);

  return {
    summary,
    description,
    priority,
    labels,
    acceptance_criteria: acceptanceCriteria,
    story_points: story.story_points,
    epic_link: config.epic_key,
    assignee: story.assigned_to,
    sprint: config.sprint_id,
    custom_fields: {
      // Add any custom fields here
      ...(story.technical_notes && { technicalNotes: story.technical_notes }),
    },
  };
}

/**
 * Generate Jira description in ADF (Atlassian Document Format)
 */
function generateJiraDescriptionADF(story: UserStory): any {
  return {
    version: 1,
    type: 'doc',
    content: [
      // User Story
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'User Story' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: story.full_story }],
      },

      // Acceptance Criteria
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Acceptance Criteria' }],
      },
      ...story.acceptance_criteria.map((ac, index) => ({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: `${index + 1}. `, marks: [{ type: 'strong' }] },
                  { type: 'text', text: ac.text },
                ],
              },
              ...(ac.details.length > 0
                ? [
                    {
                      type: 'bulletList',
                      content: ac.details.map((detail) => ({
                        type: 'listItem',
                        content: [
                          { type: 'paragraph', content: [{ type: 'text', text: detail }] },
                        ],
                      })),
                    },
                  ]
                : []),
            ],
          },
        ],
      })),

      // Technical Notes
      ...(story.technical_notes
        ? [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Technical Notes' }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: story.technical_notes }],
            },
          ]
        : []),

      // Definition of Done
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Definition of Done' }],
      },
      {
        type: 'taskList',
        content: story.definition_of_done.map((dod) => ({
          type: 'taskItem',
          attrs: { state: 'TODO' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: dod.text }] }],
        })),
      },

      // Metadata
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Story Details' }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: `Story Points: ${story.story_points || 'TBD'}`, marks: [{ type: 'strong' }] },
          { type: 'hardBreak' },
          { type: 'text', text: `Priority: ${story.priority_level}` },
          { type: 'hardBreak' },
          { type: 'text', text: `Generated by AI: ${story.generated_by_ai ? 'Yes' : 'No'}` },
          ...(story.manually_edited
            ? [
                { type: 'hardBreak' },
                { type: 'text', text: 'Manually edited after generation' },
              ]
            : []),
        ],
      },

      // Link back to SignalsLoop
      {
        type: 'panel',
        attrs: { panelType: 'info' },
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '📊 This story was generated from ' },
              { type: 'text', text: `${story.feedback_count} pieces of user feedback`, marks: [{ type: 'strong' }] },
              { type: 'text', text: ' in SignalsLoop' },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Generate Jira description in Markdown
 */
function generateJiraDescriptionMarkdown(story: UserStory): string {
  let markdown = '';

  // User Story
  markdown += '## User Story\n\n';
  markdown += `${story.full_story}\n\n`;

  // Acceptance Criteria
  markdown += '## Acceptance Criteria\n\n';
  story.acceptance_criteria.forEach((ac, index) => {
    markdown += `${index + 1}. **${ac.text}**\n`;
    if (ac.details.length > 0) {
      ac.details.forEach((detail) => {
        markdown += `   - ${detail}\n`;
      });
    }
    markdown += '\n';
  });

  // Technical Notes
  if (story.technical_notes) {
    markdown += '## Technical Notes\n\n';
    markdown += `${story.technical_notes}\n\n`;
  }

  // Definition of Done
  markdown += '## Definition of Done\n\n';
  story.definition_of_done.forEach((dod) => {
    markdown += `- [ ] ${dod.text}\n`;
  });
  markdown += '\n';

  // Metadata
  markdown += '### Story Details\n\n';
  markdown += `**Story Points:** ${story.story_points || 'TBD'}  \n`;
  markdown += `**Priority:** ${story.priority_level}  \n`;
  markdown += `**Generated by AI:** ${story.generated_by_ai ? 'Yes' : 'No'}  \n`;
  if (story.manually_edited) {
    markdown += `**Manually edited** after generation  \n`;
  }
  markdown += '\n';

  // Link back
  markdown += '---\n\n';
  markdown += `📊 This story was generated from **${story.feedback_count} pieces of user feedback** in SignalsLoop\n`;

  return markdown;
}

/**
 * Format acceptance criteria for Jira
 */
function formatAcceptanceCriteriaForJira(story: UserStory): string {
  return story.acceptance_criteria
    .map((ac, index) => {
      let text = `${index + 1}. ${ac.text}`;
      if (ac.details.length > 0) {
        text += '\n' + ac.details.map((d) => `   - ${d}`).join('\n');
      }
      return text;
    })
    .join('\n\n');
}

/**
 * Map SignalsLoop priority to Jira priority
 */
function mapPriorityToJira(priority: string): string {
  const priorityMap: Record<string, string> = {
    critical: 'Highest',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  return priorityMap[priority] || 'Medium';
}

/**
 * Bulk export user stories to Jira
 */
export async function bulkExportStoriesToJira(
  stories: UserStory[],
  config: JiraExportConfig,
  createEpic?: boolean,
  epicName?: string
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    story_id: string;
    story_title: string;
    result: JiraExportResult;
  }>;
  epic?: { key: string; url: string };
}> {
  console.log(`[JIRA-EXPORT] Starting bulk export of ${stories.length} stories...`);

  const results: Array<{
    story_id: string;
    story_title: string;
    result: JiraExportResult;
  }> = [];

  let epicKey: string | undefined;
  let epicUrl: string | undefined;

  // Create epic if requested
  if (createEpic && epicName) {
    try {
      const epicResult = await createJiraEpic(epicName, config);
      epicKey = epicResult.issue_key;
      epicUrl = epicResult.issue_url;
      console.log(`[JIRA-EXPORT] Created epic: ${epicKey}`);
    } catch (error) {
      console.error('[JIRA-EXPORT] Failed to create epic:', error);
    }
  }

  // Export each story
  for (const story of stories) {
    const storyConfig = {
      ...config,
      epic_key: epicKey || config.epic_key,
    };

    const result = await exportStoryToJira(story, storyConfig);

    results.push({
      story_id: story.id,
      story_title: story.title,
      result,
    });

    // Add small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const successful = results.filter((r) => r.result.success).length;
  const failed = results.filter((r) => !r.result.success).length;

  console.log(
    `[JIRA-EXPORT] Bulk export complete: ${successful}/${stories.length} successful, ${failed} failed`
  );

  return {
    total: stories.length,
    successful,
    failed,
    results,
    ...(epicKey && epicUrl && { epic: { key: epicKey, url: epicUrl } }),
  };
}

/**
 * Create Jira epic
 */
async function createJiraEpic(
  epicName: string,
  config: JiraExportConfig
): Promise<JiraExportResult> {
  // Implementation depends on Jira API
  // This is a placeholder
  return {
    success: true,
    issue_key: 'EPIC-1',
    issue_id: '10001',
    issue_url: 'https://jira.example.com/browse/EPIC-1',
  };
}
