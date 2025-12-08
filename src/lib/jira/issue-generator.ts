/**
 * AI-Powered Jira Issue Generator
 *
 * Uses GPT-4 to generate high-quality Jira issues from customer feedback.
 * Automatically creates titles, descriptions, acceptance criteria, and suggests priorities.
 */

import { getOpenAI } from '@/lib/openai-client';
import { markdownToADF, ADF } from './api';
import { withCache } from '../ai-cache-manager';


const MODEL = process.env.JIRA_ISSUE_MODEL || 'gpt-4o';

/**
 * Feedback data for issue generation
 */
export interface FeedbackForIssue {
  content: string;
  sentiment: number; // -1 to 1
  theme?: string;
  platform?: string;
  mention_count?: number;
  revenue_risk?: number;
  classification?: string;
  urgency_score?: number;
  author_username?: string;
  platform_url?: string;
}

/**
 * Generated Jira issue data
 */
export interface GeneratedIssue {
  summary: string; // Issue title
  description: ADF; // Issue description in ADF format
  descriptionMarkdown: string; // Original markdown
  priority: string; // Jira priority name
  labels: string[]; // Suggested labels
  issueType: string; // Suggested issue type (Bug, Story, Task, etc.)
}

/**
 * Multiple feedback items for bulk generation
 */
export interface BulkFeedbackData {
  feedbackItems: FeedbackForIssue[];
  theme: string;
  totalMentions: number;
  avgSentiment: number;
}

/**
 * System prompt for issue generation
 */
const ISSUE_GENERATION_PROMPT = `You are an expert product manager and technical writer who creates clear, actionable Jira issues from customer feedback.

Your task is to transform customer feedback into a well-structured Jira issue.

## Guidelines:

### Summary (Title)
- Keep it under 100 characters
- Make it action-oriented and specific
- Start with a verb when possible (Fix, Add, Improve, Update)
- Focus on the problem or desired outcome, not the implementation

### Description
Generate a detailed markdown description with these sections:

**## Problem**
- Clearly describe what the issue is
- Include the user's perspective
- Explain the impact on users

**## User Quote**
- Include the actual customer feedback as a blockquote
- Add platform/source information
- Preserve the authentic voice

**## Impact**
- Business impact (if revenue_risk provided)
- User sentiment and engagement
- How many users are affected (if mention_count provided)
- Urgency and importance

**## Acceptance Criteria**
- Create a checklist of specific, testable conditions
- Each item should be clear and measurable
- Include both functional and non-functional requirements if relevant
- Use markdown checkboxes: - [ ] Item

**## Context**
- Platform/channel where feedback was discovered
- Link to original feedback (if platform_url provided)
- Any relevant metadata (theme, classification)
- Link to SignalsLoop for full context

### Priority
Choose from: Highest, High, Medium, Low, Lowest

Consider:
- Sentiment score (-1 = very negative → Highest priority)
- Revenue at risk (high risk → Highest priority)
- Mention count (many users → Higher priority)
- Urgency score (5 = critical → Highest priority)

Priority Guidelines:
- Highest: Critical bugs, security issues, major revenue risk (>$10k), sentiment < -0.7
- High: Important features, significant pain points, revenue risk ($5k-$10k), sentiment -0.4 to -0.7
- Medium: Standard improvements, moderate impact, sentiment -0.4 to 0.4
- Low: Nice-to-haves, minor improvements, sentiment 0.4 to 0.7
- Lowest: Cosmetic changes, future considerations, sentiment > 0.7

### Labels
- Generate 2-5 relevant labels
- Use lowercase, hyphenated format (e.g., "mobile-app", "performance", "user-experience")
- Include platform if relevant
- Include theme/category

### Issue Type
Choose the most appropriate:
- Bug: Something is broken or not working as expected
- Story: New feature or enhancement request
- Task: Work that needs to be done (technical debt, refactoring)
- Improvement: Enhancement to existing functionality

## Output Format
Return valid JSON only (no markdown code blocks):
{
  "summary": "...",
  "description": "... markdown ...",
  "priority": "High|Medium|Low|...",
  "labels": ["label1", "label2"],
  "issueType": "Bug|Story|Task|Improvement"
}`;

/**
 * Generates a Jira issue from a single feedback item.
 *
 * @param feedback - Feedback data
 * @returns Generated issue data
 */
export async function generateIssueFromFeedback(
  feedback: FeedbackForIssue
): Promise<GeneratedIssue> {
  // Build context for the AI
  const context = buildFeedbackContext(feedback);

  const cacheKey = `jira-issue:${hashString(feedback.content)}:${feedback.sentiment}`;

  const generate = async () => {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: ISSUE_GENERATION_PROMPT
          },
          {
            role: 'user',
            content: context
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const generated = JSON.parse(content);

      // Validate required fields
      if (!generated.summary || !generated.description || !generated.priority) {
        throw new Error('Invalid response format from AI');
      }

      // Convert markdown description to ADF
      const descriptionADF = markdownToADF(generated.description);

      return {
        summary: generated.summary.trim(),
        description: descriptionADF,
        descriptionMarkdown: generated.description,
        priority: generated.priority,
        labels: generated.labels || [],
        issueType: generated.issueType || inferIssueType(feedback)
      };
    } catch (error) {
      console.error('Failed to generate issue from feedback:', error);
      throw new Error('Failed to generate Jira issue. Please try again.');
    }
  };

  // Use cache for consistent results
  return withCache(cacheKey, generate, { ttl: 3600 }); // Cache for 1 hour
}

/**
 * Generates a Jira Epic from multiple related feedback items.
 *
 * @param bulkData - Multiple feedback items with theme
 * @returns Generated epic data
 */
export async function generateEpicFromBulk(
  bulkData: BulkFeedbackData
): Promise<GeneratedIssue> {
  const context = buildBulkContext(bulkData);

  const epicPrompt = `${ISSUE_GENERATION_PROMPT}

For this task, you're creating a Jira EPIC that encompasses multiple related feedback items.

The epic should:
- Summarize the overarching theme/problem
- Reference the number of users affected
- Include key quotes from different users
- Set clear, high-level acceptance criteria
- The issue type should be "Epic"`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: epicPrompt
        },
        {
          role: 'user',
          content: context
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 3000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const generated = JSON.parse(content);

    const descriptionADF = markdownToADF(generated.description);

    return {
      summary: generated.summary.trim(),
      description: descriptionADF,
      descriptionMarkdown: generated.description,
      priority: generated.priority,
      labels: [...(generated.labels || []), 'epic', 'theme-cluster'],
      issueType: 'Epic'
    };
  } catch (error) {
    console.error('Failed to generate epic from bulk feedback:', error);
    throw new Error('Failed to generate Jira epic. Please try again.');
  }
}

/**
 * Builds context string for single feedback item.
 */
function buildFeedbackContext(feedback: FeedbackForIssue): string {
  let context = `Feedback: "${feedback.content}"\n`;
  context += `Sentiment: ${feedback.sentiment.toFixed(2)} (-1 = very negative, +1 = very positive)\n`;

  if (feedback.platform) {
    context += `Platform: ${feedback.platform}\n`;
  }

  if (feedback.theme) {
    context += `Theme: ${feedback.theme}\n`;
  }

  if (feedback.classification) {
    context += `Classification: ${feedback.classification}\n`;
  }

  if (feedback.urgency_score !== undefined) {
    context += `Urgency Score: ${feedback.urgency_score}/5\n`;
  }

  if (feedback.mention_count !== undefined && feedback.mention_count > 1) {
    context += `Similar mentions: ${feedback.mention_count} users reporting this\n`;
  }

  if (feedback.revenue_risk !== undefined && feedback.revenue_risk > 0) {
    context += `Revenue at risk: $${feedback.revenue_risk.toLocaleString()}\n`;
  }

  if (feedback.author_username) {
    context += `Author: ${feedback.author_username}\n`;
  }

  if (feedback.platform_url) {
    context += `Source URL: ${feedback.platform_url}\n`;
  }

  return context;
}

/**
 * Builds context string for bulk feedback.
 */
function buildBulkContext(bulkData: BulkFeedbackData): string {
  let context = `Theme: ${bulkData.theme}\n`;
  context += `Total mentions: ${bulkData.totalMentions} users\n`;
  context += `Average sentiment: ${bulkData.avgSentiment.toFixed(2)}\n\n`;
  context += `Sample feedback items:\n\n`;

  bulkData.feedbackItems.slice(0, 10).forEach((item, index) => {
    context += `${index + 1}. "${item.content}"\n`;
    context += `   - Platform: ${item.platform || 'Unknown'}\n`;
    context += `   - Sentiment: ${item.sentiment.toFixed(2)}\n`;
    if (item.author_username) {
      context += `   - Author: ${item.author_username}\n`;
    }
    context += '\n';
  });

  return context;
}

/**
 * Infers issue type from feedback classification.
 */
function inferIssueType(feedback: FeedbackForIssue): string {
  if (!feedback.classification) {
    return 'Task';
  }

  const classificationMap: Record<string, string> = {
    bug: 'Bug',
    feature_request: 'Story',
    praise: 'Task',
    complaint: 'Bug',
    churn_risk: 'Bug',
    question: 'Task',
    other: 'Task'
  };

  return classificationMap[feedback.classification] || 'Task';
}

/**
 * Simple hash function for cache keys.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generates multiple issues from a list of feedback items.
 *
 * Useful for batch processing.
 *
 * @param feedbackList - Array of feedback items
 * @param options - Generation options
 * @returns Array of generated issues
 */
export async function generateBulkIssues(
  feedbackList: FeedbackForIssue[],
  options: {
    parallel?: boolean;
    maxConcurrent?: number;
  } = {}
): Promise<GeneratedIssue[]> {
  const { parallel = false, maxConcurrent = 3 } = options;

  if (!parallel) {
    // Sequential generation
    const issues: GeneratedIssue[] = [];
    for (const feedback of feedbackList) {
      const issue = await generateIssueFromFeedback(feedback);
      issues.push(issue);
    }
    return issues;
  }

  // Parallel generation with concurrency limit
  const results: GeneratedIssue[] = [];
  for (let i = 0; i < feedbackList.length; i += maxConcurrent) {
    const batch = feedbackList.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(feedback => generateIssueFromFeedback(feedback))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Validates generated issue data.
 *
 * @param issue - Generated issue
 * @returns true if valid, throws error otherwise
 */
export function validateGeneratedIssue(issue: GeneratedIssue): boolean {
  if (!issue.summary || issue.summary.length === 0) {
    throw new Error('Issue summary is required');
  }

  if (issue.summary.length > 255) {
    throw new Error('Issue summary is too long (max 255 characters)');
  }

  if (!issue.description) {
    throw new Error('Issue description is required');
  }

  const validPriorities = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
  if (!validPriorities.includes(issue.priority)) {
    throw new Error(`Invalid priority: ${issue.priority}`);
  }

  const validIssueTypes = ['Bug', 'Story', 'Task', 'Epic', 'Improvement'];
  if (!validIssueTypes.includes(issue.issueType)) {
    throw new Error(`Invalid issue type: ${issue.issueType}`);
  }

  return true;
}
