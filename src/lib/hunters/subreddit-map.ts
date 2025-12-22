/**
 * Subreddit Mapping by Product Category
 * Helps target discovery to relevant communities
 */

export const SUBREDDIT_MAP: Record<string, string[]> = {
    // Product & Feedback Tools
    'product_feedback_tool': ['ProductManagement', 'startups', 'SaaS', 'indiehackers', 'Entrepreneur'],
    'product_management': ['ProductManagement', 'productmanager', 'startups', 'agile'],

    // Project Management
    'project_management': ['ProductManagement', 'agile', 'projectmanagement', 'scrum', 'Jira'],
    'task_management': ['productivity', 'gtd', 'Notion', 'todoist'],

    // Developer Tools
    'developer_tool': ['webdev', 'programming', 'devops', 'javascript', 'typescript', 'node', 'react'],
    'api_tool': ['webdev', 'programming', 'api', 'aws', 'devops'],
    'database_tool': ['programming', 'database', 'PostgreSQL', 'mongodb', 'sql'],

    // Design Tools
    'design_tool': ['userexperience', 'UI_Design', 'web_design', 'figma', 'graphic_design'],
    'ux_design': ['userexperience', 'UI_Design', 'UXDesign', 'ProductManagement'],

    // Marketing & Analytics
    'marketing_tool': ['marketing', 'digital_marketing', 'startups', 'SEO', 'analytics'],
    'analytics': ['analytics', 'datascience', 'ProductManagement', 'GoogleAnalytics'],
    'seo_tool': ['SEO', 'marketing', 'bigseo', 'TechSEO'],

    // Communication & Collaboration
    'collaboration_tool': ['Slack', 'productivity', 'remotework', 'startups'],
    'communication_tool': ['SaaS', 'productivity', 'remotework'],

    // Finance & Payments
    'payment_tool': ['startups', 'SaaS', 'stripe', 'fintech'],
    'finance_tool': ['fintech', 'startups', 'PersonalFinance'],

    // Customer Support
    'support_tool': ['SaaS', 'startups', 'CustomerSuccess', 'helpdesk'],
    'crm_tool': ['salesforce', 'sales', 'SaaS', 'startups'],

    // AI & ML
    'ai_tool': ['artificial', 'MachineLearning', 'OpenAI', 'LocalLLaMA', 'ChatGPT'],

    // General SaaS
    'saas': ['SaaS', 'startups', 'smallbusiness', 'Entrepreneur'],
};

/**
 * Get relevant subreddits for a product category
 */
export function getSubredditsForCategory(category: string): string[] {
    // Direct match
    if (SUBREDDIT_MAP[category.toLowerCase().replace(/\s+/g, '_')]) {
        return SUBREDDIT_MAP[category.toLowerCase().replace(/\s+/g, '_')];
    }

    // Partial match
    for (const [key, subreddits] of Object.entries(SUBREDDIT_MAP)) {
        if (category.toLowerCase().includes(key.replace(/_/g, ' ')) ||
            key.replace(/_/g, ' ').includes(category.toLowerCase())) {
            return subreddits;
        }
    }

    // Default fallback for SaaS products
    return SUBREDDIT_MAP['saas'];
}

/**
 * Get all unique subreddits across categories
 */
export function getAllSubreddits(): string[] {
    const all = new Set<string>();
    for (const subreddits of Object.values(SUBREDDIT_MAP)) {
        for (const sub of subreddits) {
            all.add(sub);
        }
    }
    return Array.from(all);
}
