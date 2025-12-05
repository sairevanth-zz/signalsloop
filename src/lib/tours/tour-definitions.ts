/**
 * Tour Definitions
 * Configuration for all interactive product tours
 */

export interface TourStep {
  id: string;
  target: string;           // CSS selector for target element
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlightPadding?: number;
  action?: {
    type: 'click' | 'input' | 'scroll' | 'wait';
    value?: string;
  };
  beforeShow?: () => void;
  onComplete?: () => void;
  canSkip?: boolean;
  showProgress?: boolean;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
  triggerRoute?: string;    // Auto-start on this route
  triggerCondition?: () => boolean;
  showOnce?: boolean;
  version?: number;         // Increment to re-show tour after updates
  category: 'onboarding' | 'feature' | 'update';
}

export const TOURS: Record<string, Tour> = {
  'mission-control': {
    id: 'mission-control',
    name: 'Mission Control Overview',
    description: 'Learn how to use your AI-powered command center',
    triggerRoute: '/dashboard',
    showOnce: true,
    version: 1,
    category: 'onboarding',
    steps: [
      {
        id: 'welcome',
        target: '[data-tour="mission-control"]',
        title: '👋 Welcome to Mission Control',
        content: 'This is your AI-powered command center. Here you\'ll find everything you need to stay on top of your product feedback.',
        position: 'center',
        showProgress: true,
      },
      {
        id: 'briefing',
        target: '[data-tour="briefing-card"]',
        title: '📋 Daily AI Briefing',
        content: 'Every morning, AI analyzes overnight feedback and generates a personalized briefing with critical alerts, recommended actions, and opportunities.',
        position: 'bottom',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'audio-player',
        target: '[data-tour="audio-player"]',
        title: '🎧 Listen to Your Briefing',
        content: 'Don\'t have time to read? Generate an audio version of your briefing and listen while you commute.',
        position: 'top',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'anomalies',
        target: '[data-tour="anomaly-card"]',
        title: '🚨 Anomaly Detection',
        content: 'AI automatically detects unusual patterns in feedback volume, sentiment, and themes. Get alerted before small issues become big problems.',
        position: 'left',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'action-queue',
        target: '[data-tour="action-queue"]',
        title: '⚡ Action Queue',
        content: 'AI-recommended actions prioritized by impact. Click any action to execute it instantly.',
        position: 'top',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'health-score',
        target: '[data-tour="health-score"]',
        title: '💪 Product Health Score',
        content: 'A composite score combining sentiment, feedback velocity, and competitive position. Track how your product is doing at a glance.',
        position: 'left',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'ask-button',
        target: '[data-tour="ask-button"]',
        title: '💬 Ask SignalsLoop (⌘K)',
        content: 'Have a question? Ask anything about your feedback in natural language. Try "What are customers complaining about?" or "Show me feature requests from enterprise users."',
        position: 'bottom',
        highlightPadding: 8,
        showProgress: true,
      },
    ],
  },

  'spec-writer': {
    id: 'spec-writer',
    name: 'AI Spec Writer',
    description: 'Learn how to generate PRDs in 30 seconds',
    triggerRoute: '/specs/new',
    showOnce: true,
    version: 1,
    category: 'feature',
    steps: [
      {
        id: 'intro',
        target: '[data-tour="spec-wizard"]',
        title: '✨ AI Spec Writer',
        content: 'Generate comprehensive PRDs in 30 seconds. AI uses your past specs, feedback, and personas to create context-aware documents.',
        position: 'center',
        showProgress: true,
      },
      {
        id: 'input',
        target: '[data-tour="spec-input"]',
        title: '✍️ Enter Your Idea',
        content: 'Type a one-line description of the feature you want to build. Be as brief or detailed as you like.',
        position: 'bottom',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'template',
        target: '[data-tour="template-selector"]',
        title: '📄 Choose Template',
        content: 'Select the type of spec: Standard PRD, Feature Launch, Bug Fix, or API Spec. Each template is optimized for its use case.',
        position: 'right',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'context',
        target: '[data-tour="context-panel"]',
        title: '🔍 Context Sources',
        content: 'AI automatically retrieves relevant context from your past specs, feedback themes, and personas. You can add or remove sources here.',
        position: 'left',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'generate',
        target: '[data-tour="generate-button"]',
        title: '🚀 Generate',
        content: 'Click to generate. AI will stream the spec in real-time. You can edit, regenerate sections, or start over.',
        position: 'top',
        highlightPadding: 8,
        showProgress: true,
      },
    ],
  },

  'competitive-intel': {
    id: 'competitive-intel',
    name: 'Competitive Intelligence',
    description: 'Track and analyze competitor mentions',
    triggerRoute: '/competitive',
    showOnce: true,
    version: 1,
    category: 'feature',
    steps: [
      {
        id: 'overview',
        target: '[data-tour="competitive-dashboard"]',
        title: '🎯 Competitive Intelligence',
        content: 'AI automatically identifies competitor mentions in your feedback and extracts strategic insights.',
        position: 'center',
        showProgress: true,
      },
      {
        id: 'mentions',
        target: '[data-tour="competitor-mentions"]',
        title: '💬 Competitor Mentions',
        content: 'See every time a competitor is mentioned. AI analyzes sentiment and context to understand what customers are saying.',
        position: 'bottom',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'feature-gaps',
        target: '[data-tour="feature-gaps"]',
        title: '🔍 Feature Gap Analysis',
        content: 'AI identifies features that competitors have that your customers are asking for. Prioritized by customer demand.',
        position: 'right',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'recommendations',
        target: '[data-tour="strategic-recommendations"]',
        title: '💡 Strategic Recommendations',
        content: 'GPT-4 generates strategic recommendations based on competitive patterns. Updated weekly.',
        position: 'left',
        highlightPadding: 8,
        showProgress: true,
      },
    ],
  },

  'feedback-hunter': {
    id: 'feedback-hunter',
    name: 'Feedback Hunter',
    description: 'Discover feedback from across the web',
    triggerRoute: '/hunter',
    showOnce: true,
    version: 1,
    category: 'feature',
    steps: [
      {
        id: 'platforms',
        target: '[data-tour="hunter-platforms"]',
        title: '🌐 8 Platform Sources',
        content: 'Automatically discover feedback from Twitter, Reddit, G2, Product Hunt, Hacker News, and more. No manual searching required.',
        position: 'bottom',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'feed',
        target: '[data-tour="feedback-feed"]',
        title: '📰 Unified Feed',
        content: 'All feedback from all sources in one place. Sorted by relevance, sentiment, and engagement.',
        position: 'right',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'classification',
        target: '[data-tour="feedback-classification"]',
        title: '🏷️ Auto-Classification',
        content: 'AI automatically classifies feedback as Feature Request, Bug Report, Praise, or Question.',
        position: 'left',
        highlightPadding: 8,
        showProgress: true,
      },
    ],
  },

  'ask-signalsloop': {
    id: 'ask-signalsloop',
    name: 'Ask SignalsLoop',
    description: 'Natural language queries for your feedback',
    triggerRoute: '/ask',
    showOnce: true,
    version: 1,
    category: 'feature',
    steps: [
      {
        id: 'input',
        target: '[data-tour="ask-input"]',
        title: '💬 Ask Anything',
        content: 'Type any question about your feedback in natural language. "What are enterprise customers saying?" or "Show me complaints about pricing."',
        position: 'bottom',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'voice',
        target: '[data-tour="voice-input"]',
        title: '🎤 Voice Input',
        content: 'Click the microphone to ask questions with your voice. Great for quick queries.',
        position: 'right',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'actions',
        target: '[data-tour="ask-actions"]',
        title: '⚡ Execute Actions',
        content: 'Ask SignalsLoop can also execute actions: "Create a spec for dark mode" or "Escalate this feedback to Slack."',
        position: 'top',
        highlightPadding: 8,
        showProgress: true,
      },
    ],
  },

  'roadmap': {
    id: 'roadmap',
    name: 'Dynamic Roadmap',
    description: 'AI-powered roadmap prioritization',
    triggerRoute: '/roadmap',
    showOnce: true,
    version: 1,
    category: 'feature',
    steps: [
      {
        id: 'kanban',
        target: '[data-tour="roadmap-kanban"]',
        title: '📋 Visual Roadmap',
        content: 'Drag and drop items between stages. AI tracks all changes and their impact on your product strategy.',
        position: 'center',
        showProgress: true,
      },
      {
        id: 'priority',
        target: '[data-tour="priority-indicator"]',
        title: '🎯 AI Priority Scoring',
        content: 'Each item gets an AI-generated priority score based on customer demand, strategic value, and effort estimation.',
        position: 'right',
        highlightPadding: 8,
        showProgress: true,
      },
      {
        id: 'impact-simulator',
        target: '[data-tour="impact-simulator"]',
        title: '🔮 Impact Simulator',
        content: 'Run "what-if" scenarios. What happens if we prioritize this feature? How does it affect sentiment and churn?',
        position: 'left',
        highlightPadding: 8,
        showProgress: true,
      },
    ],
  },
};

export function getTourById(id: string): Tour | undefined {
  return TOURS[id];
}

export function getToursByRoute(route: string): Tour[] {
  return Object.values(TOURS).filter(
    (tour) => tour.triggerRoute && route.startsWith(tour.triggerRoute)
  );
}

export function getToursByCategory(category: Tour['category']): Tour[] {
  return Object.values(TOURS).filter((tour) => tour.category === category);
}

export function getAllTours(): Tour[] {
  return Object.values(TOURS);
}
