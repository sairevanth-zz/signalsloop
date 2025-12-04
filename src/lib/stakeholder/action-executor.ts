/**
 * Action Execution Framework
 *
 * Handles execution of user-requested actions like:
 * - Create PRD
 * - Send to Slack
 * - Create JIRA ticket
 * - Schedule meeting
 * - Export report
 */

export interface Action {
  id: string;
  type: 'create_prd' | 'send_slack' | 'create_jira' | 'schedule_meeting' | 'export_report' | 'send_email';
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  params?: Record<string, any>;
  result?: any;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Create a Product Requirements Document
 */
export async function executeCreatePRD(
  projectId: string,
  context: {
    query: string;
    themes: string[];
    feedback: any[];
    insights: string;
  }
): Promise<ActionResult> {
  try {
    // Generate PRD content using Claude
    const response = await fetch('/api/stakeholder/actions/create-prd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, context }),
    });

    if (!response.ok) {
      throw new Error('Failed to create PRD');
    }

    const result = await response.json();

    return {
      success: true,
      message: 'PRD created successfully',
      data: result.prd,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to create PRD',
      error: error.message,
    };
  }
}

/**
 * Send message to Slack
 */
export async function executeSendToSlack(
  projectId: string,
  context: {
    channel: string;
    message: string;
    attachments?: any[];
  }
): Promise<ActionResult> {
  try {
    const response = await fetch('/api/stakeholder/actions/send-slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, context }),
    });

    if (!response.ok) {
      throw new Error('Failed to send to Slack');
    }

    const result = await response.json();

    return {
      success: true,
      message: `Message sent to ${context.channel}`,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to send to Slack',
      error: error.message,
    };
  }
}

/**
 * Create JIRA ticket
 */
export async function executeCreateJira(
  projectId: string,
  context: {
    summary: string;
    description: string;
    issueType: 'Bug' | 'Story' | 'Task';
    priority: 'High' | 'Medium' | 'Low';
  }
): Promise<ActionResult> {
  try {
    const response = await fetch('/api/stakeholder/actions/create-jira', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, context }),
    });

    if (!response.ok) {
      throw new Error('Failed to create JIRA ticket');
    }

    const result = await response.json();

    return {
      success: true,
      message: `JIRA ticket ${result.key} created`,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to create JIRA ticket',
      error: error.message,
    };
  }
}

/**
 * Send email report
 */
export async function executeSendEmail(
  projectId: string,
  context: {
    recipients: string[];
    subject: string;
    body: string;
    attachments?: any[];
  }
): Promise<ActionResult> {
  try {
    const response = await fetch('/api/stakeholder/actions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, context }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    const result = await response.json();

    return {
      success: true,
      message: `Email sent to ${context.recipients.length} recipient(s)`,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to send email',
      error: error.message,
    };
  }
}

/**
 * Execute action based on type
 */
export async function executeAction(
  action: Action,
  projectId: string
): Promise<ActionResult> {
  switch (action.type) {
    case 'create_prd':
      return await executeCreatePRD(projectId, action.params || {});

    case 'send_slack':
      return await executeSendToSlack(projectId, action.params || {});

    case 'create_jira':
      return await executeCreateJira(projectId, action.params || {});

    case 'send_email':
      return await executeSendEmail(projectId, action.params || {});

    default:
      return {
        success: false,
        message: `Unknown action type: ${action.type}`,
      };
  }
}

/**
 * Detect if query contains action intent
 */
export function detectActionIntent(query: string): Action[] {
  const actions: Action[] = [];
  const lowerQuery = query.toLowerCase();

  // Detect PRD creation (flexible matching)
  const prdPatterns = [
    /create.*prd/i,
    /write.*prd/i,
    /generate.*prd/i,
    /make.*prd/i,
    /build.*prd/i,
    /product requirements/i,
    /requirements document/i,
  ];

  if (prdPatterns.some(pattern => pattern.test(query))) {
    actions.push({
      id: 'prd_' + Date.now(),
      type: 'create_prd',
      title: 'Create Product Requirements Document',
      description: 'Generate a comprehensive PRD based on this analysis',
      icon: 'FileText',
      status: 'pending',
    });
  }

  // Detect Slack sharing (flexible matching)
  const slackPatterns = [
    /send.*slack/i,
    /share.*slack/i,
    /post.*slack/i,
    /slack.*message/i,
    /notify.*slack/i,
  ];

  if (slackPatterns.some(pattern => pattern.test(query))) {
    actions.push({
      id: 'slack_' + Date.now(),
      type: 'send_slack',
      title: 'Send to Slack',
      description: 'Share this report with your team on Slack',
      icon: 'MessageSquare',
      status: 'pending',
    });
  }

  // Detect JIRA ticket creation (flexible matching)
  const jiraPatterns = [
    /create.*jira/i,
    /create.*ticket/i,
    /file.*bug/i,
    /jira.*ticket/i,
    /open.*ticket/i,
    /create.*issue/i,
  ];

  if (jiraPatterns.some(pattern => pattern.test(query))) {
    actions.push({
      id: 'jira_' + Date.now(),
      type: 'create_jira',
      title: 'Create JIRA Ticket',
      description: 'Create a ticket based on this feedback',
      icon: 'CheckSquare',
      status: 'pending',
    });
  }

  // Detect email sending (flexible matching)
  const emailPatterns = [
    /send.*email/i,
    /email.*report/i,
    /email.*this/i,
    /mail.*report/i,
    /share.*email/i,
  ];

  if (emailPatterns.some(pattern => pattern.test(query))) {
    actions.push({
      id: 'email_' + Date.now(),
      type: 'send_email',
      title: 'Send Email Report',
      description: 'Email this report to stakeholders',
      icon: 'Mail',
      status: 'pending',
    });
  }

  return actions;
}
