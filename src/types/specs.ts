/**
 * Spec Writer Agent Types
 * Type definitions for AI-generated Product Requirements Documents (PRDs)
 */

// ============================================================================
// Database Types
// ============================================================================

export type SpecStatus = 'draft' | 'review' | 'approved' | 'archived';
export type SpecTemplate = 'standard' | 'feature-launch' | 'bug-fix' | 'api-spec';
export type InputType = 'idea' | 'feedback';
export type ContextSourceType = 'feedback' | 'past_spec' | 'competitor' | 'persona';
export type ExportFormat = 'jira' | 'markdown' | 'clipboard' | 'link';

/**
 * Context source metadata (stored in JSONB)
 */
export interface ContextSourceMetadata {
  type: ContextSourceType;
  id: string;
  title: string;
  preview: string;
  relevanceScore: number;
}

/**
 * Main Spec entity
 */
export interface Spec {
  id: string;
  project_id: string;
  created_by: string;

  // Content
  title: string;
  input_idea?: string;
  content: string; // Markdown PRD content

  // Metadata
  status: SpecStatus;
  template: SpecTemplate;

  // AI Generation metadata
  generation_model: string;
  generation_tokens?: number;
  generation_time_ms?: number;
  context_sources: ContextSourceMetadata[];

  // Feedback linkage
  linked_feedback_ids: string[];

  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
}

/**
 * Spec with enriched data for display
 */
export interface SpecWithDetails extends Spec {
  creator_name?: string;
  creator_email?: string;
  feedback_count: number;
  total_votes: number; // Sum of votes from linked feedback
  version_count: number;
}

/**
 * Spec version for history tracking
 */
export interface SpecVersion {
  id: string;
  spec_id: string;
  version_number: number;
  content: string;
  changed_by: string;
  change_summary?: string;
  created_at: string;
}

/**
 * Spec embedding for vector similarity search
 */
export interface SpecEmbedding {
  id: string;
  spec_id: string;
  embedding: number[]; // vector(1536)
  content_hash: string;
  created_at: string;
}

/**
 * Context source record (what was retrieved during generation)
 */
export interface SpecContextSource {
  id: string;
  spec_id: string;
  source_type: ContextSourceType;
  source_id: string;
  relevance_score?: number;
  content_preview?: string;
  created_at: string;
}

// ============================================================================
// RAG Context Types
// ============================================================================

/**
 * Past spec for context
 */
export interface PastSpecContext {
  id: string;
  title: string;
  preview: string; // First 500 chars of content
  relevanceScore: number;
  created_at: string;
}

/**
 * Persona for context
 */
export interface PersonaContext {
  id: string;
  name: string;
  description: string;
  relevanceScore: number;
}

/**
 * Competitor feature for context
 */
export interface CompetitorContext {
  id: string;
  name: string;
  feature: string;
  description: string;
  relevanceScore: number;
}

/**
 * Related feedback for context
 */
export interface FeedbackContext {
  id: string;
  content: string;
  votes: number;
  segment?: string;
  relevanceScore: number;
}

/**
 * All retrieved context for spec generation
 */
export interface RetrievedContext {
  pastSpecs: PastSpecContext[];
  personas: PersonaContext[];
  competitors: CompetitorContext[];
  relatedFeedback: FeedbackContext[];
}

// ============================================================================
// Wizard State Types
// ============================================================================

/**
 * Input step data
 */
export interface InputStepData {
  type: InputType;
  idea?: string;
  feedbackIds?: string[];
  template: SpecTemplate;
  customContext?: string;
}

/**
 * Context step data
 */
export interface ContextStepData {
  selectedPastSpecs: string[]; // IDs of past specs to include
  selectedPersonas: string[]; // IDs of personas to include
  selectedCompetitors: string[]; // IDs of competitor features to include
  customContext?: string;
}

/**
 * Full wizard state
 */
export interface WizardState {
  currentStep: 'input' | 'context' | 'generating' | 'editor';
  projectId: string;
  inputData?: InputStepData;
  contextData?: ContextStepData;
  retrievedContext?: RetrievedContext;
  generatedSpec?: Spec;
  isGenerating: boolean;
  generationProgress: GenerationProgress;
  error?: string;
}

/**
 * Generation progress state
 */
export interface GenerationProgress {
  step: GenerationStep;
  progress: number; // 0-100
  message: string;
}

export type GenerationStep =
  | 'idle'
  | 'analyzing'
  | 'retrieving'
  | 'generating_problem'
  | 'generating_stories'
  | 'generating_criteria'
  | 'generating_edge_cases'
  | 'generating_metrics'
  | 'finalizing'
  | 'complete'
  | 'error';

// ============================================================================
// AI Generation Types
// ============================================================================

/**
 * Input for spec generation
 */
export interface GenerateSpecInput {
  projectId: string;
  input: {
    type: InputType;
    idea?: string;
    feedbackIds?: string[];
  };
  template: SpecTemplate;
  context: {
    pastSpecs: PastSpecContext[];
    personas: PersonaContext[];
    competitors: CompetitorContext[];
    customContext?: string;
  };
}

/**
 * AI-generated spec result
 */
export interface GeneratedSpecResult {
  specId: string;
  title: string;
  content: string;
  generationTimeMs: number;
  tokensUsed: number;
  contextSources: ContextSourceMetadata[];
}

/**
 * Feedback synthesis result (for feedback -> spec flow)
 */
export interface FeedbackSynthesis {
  suggestedTitle: string;
  commonTheme: string;
  userSegments: string[];
  priorityScore: number; // 1-10
  synthesizedProblem: string;
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * Jira export configuration
 */
export interface JiraExportConfig {
  connection_id: string;
  project_key: string;
  issue_type: string;
  use_ai_formatting?: boolean;
  epic_key?: string;
  components?: string[];
  fix_versions?: string[];
}

/**
 * Jira export result
 */
export interface JiraExportResult {
  success: boolean;
  issue_key?: string;
  issue_id?: string;
  issue_url?: string;
  error?: string;
}

/**
 * Markdown export options
 */
export interface MarkdownExportOptions {
  includeMetadata?: boolean;
  includeLinkedFeedback?: boolean;
  includeContextSources?: boolean;
}

// ============================================================================
// Statistics & Analytics Types
// ============================================================================

/**
 * Spec statistics for a project
 */
export interface SpecStats {
  total_specs: number;
  specs_by_status: {
    draft: number;
    review: number;
    approved: number;
    archived: number;
  };
  total_feedback_addressed: number;
  avg_generation_time_ms: number;
  total_time_saved_hours: number; // Assumes 4 hours saved per spec
  approval_rate: number; // Percentage of approved specs
}

/**
 * User stats for specs
 */
export interface UserSpecStats {
  specs_created: number;
  time_saved_hours: number;
  feedback_addressed: number;
  approval_rate: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface SpecWriterWizardProps {
  projectId: string;
  preselectedFeedback?: string[]; // If coming from feedback page
  onComplete: (specId: string) => void;
  onCancel: () => void;
}

export interface InputStepProps {
  projectId: string;
  initialData?: InputStepData;
  preselectedFeedback?: string[];
  onNext: (data: InputStepData) => void;
  onCancel: () => void;
}

export interface ContextStepProps {
  projectId: string;
  inputData: InputStepData;
  retrievedContext: RetrievedContext;
  initialData?: ContextStepData;
  onNext: (data: ContextStepData) => void;
  onBack: () => void;
  onCancel: () => void;
}

export interface GeneratingStepProps {
  progress: GenerationProgress;
  onCancel: () => void;
}

export interface EditorStepProps {
  spec: Spec;
  onSave: (content: string) => Promise<void>;
  onExport: (format: ExportFormat) => Promise<void>;
  onBack: () => void;
}

export interface SpecCardProps {
  spec: Spec | SpecWithDetails;
  onEdit?: (spec: Spec) => void;
  onView?: (spec: Spec) => void;
  onExport?: (spec: Spec) => void;
  onDelete?: (spec: Spec) => void;
  onStatusChange?: (spec: Spec, newStatus: SpecStatus) => void;
  showActions?: boolean;
  className?: string;
}

export interface SpecEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

export interface SpecPreviewProps {
  content: string;
  className?: string;
}

export interface FeedbackSelectorProps {
  projectId: string;
  preselected?: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  maxSelection?: number;
  className?: string;
}

export interface ContextPanelProps {
  context: RetrievedContext;
  selectedPastSpecs: string[];
  selectedPersonas: string[];
  selectedCompetitors: string[];
  onTogglePastSpec: (id: string) => void;
  onTogglePersona: (id: string) => void;
  onToggleCompetitor: (id: string) => void;
  className?: string;
}

export interface SpecTemplatesSelectorProps {
  value: SpecTemplate;
  onChange: (template: SpecTemplate) => void;
  className?: string;
}

export interface SpecActionsProps {
  spec: Spec;
  onExport: (format: ExportFormat) => void;
  onShare: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: SpecStatus) => void;
  className?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to generate spec
 */
export interface GenerateSpecRequest {
  projectId: string;
  input: {
    type: InputType;
    idea?: string;
    feedbackIds?: string[];
  };
  template: SpecTemplate;
  context: {
    includePatterns: string[]; // IDs of past specs to include
    includePersonas: string[]; // IDs of personas to include
    includeCompetitors: string[]; // IDs of competitor data to include
    customContext?: string;
  };
}

/**
 * Streaming generation event
 */
export interface GenerationEvent {
  type: 'progress' | 'complete' | 'error';
  data: GenerationProgress | GeneratedSpecResult | { error: string };
}

/**
 * Request to retrieve context for RAG
 */
export interface RetrieveContextRequest {
  projectId: string;
  query: string; // The input idea or synthesized feedback
  limit?: number; // Default 10
}

/**
 * Response with retrieved context
 */
export interface RetrieveContextResponse {
  success: boolean;
  context?: RetrievedContext;
  error?: string;
}

/**
 * Request to create/update spec
 */
export interface SaveSpecRequest {
  spec: Partial<Spec>;
  projectId: string;
  createVersion?: boolean;
  versionSummary?: string;
}

/**
 * Response from save spec
 */
export interface SaveSpecResponse {
  success: boolean;
  spec?: Spec;
  version?: SpecVersion;
  error?: string;
}

/**
 * Request to export spec
 */
export interface ExportSpecRequest {
  specId: string;
  format: ExportFormat;
  jiraConfig?: JiraExportConfig;
  markdownOptions?: MarkdownExportOptions;
}

/**
 * Response from export
 */
export interface ExportSpecResponse {
  success: boolean;
  result?: JiraExportResult | { content: string } | { url: string };
  error?: string;
}

/**
 * Request to synthesize feedback
 */
export interface SynthesizeFeedbackRequest {
  feedbackIds: string[];
  projectId: string;
}

/**
 * Response from feedback synthesis
 */
export interface SynthesizeFeedbackResponse {
  success: boolean;
  synthesis?: FeedbackSynthesis;
  error?: string;
}

/**
 * Request to get spec stats
 */
export interface GetSpecStatsRequest {
  projectId: string;
}

/**
 * Response with spec stats
 */
export interface GetSpecStatsResponse {
  success: boolean;
  stats?: SpecStats;
  error?: string;
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

/**
 * Spec filter options
 */
export interface SpecFilter {
  search?: string;
  status?: SpecStatus[];
  template?: SpecTemplate[];
  created_by?: string;
  has_linked_feedback?: boolean;
  date_range?: {
    start: Date;
    end: Date;
  };
}

/**
 * Spec sort options
 */
export type SpecSortOption =
  | 'created_desc'
  | 'created_asc'
  | 'updated_desc'
  | 'updated_asc'
  | 'title_asc'
  | 'title_desc'
  | 'feedback_count_desc'
  | 'feedback_count_asc';

/**
 * Spec list options
 */
export interface SpecListOptions {
  filter?: SpecFilter;
  sort?: SpecSortOption;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Template Types
// ============================================================================

/**
 * PRD template structure
 */
export interface PRDTemplate {
  id: SpecTemplate;
  name: string;
  description: string;
  sections: PRDSection[];
  estimatedTimeMinutes: number; // How long it typically takes AI to generate
}

/**
 * PRD section structure
 */
export interface PRDSection {
  id: string;
  title: string;
  placeholder: string;
  required: boolean;
  order: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Status color scheme
 */
export interface StatusColorScheme {
  bg: string;
  text: string;
  border: string;
  icon: string;
}

/**
 * Get status color scheme
 */
export function getStatusColorScheme(status: SpecStatus): StatusColorScheme {
  switch (status) {
    case 'draft':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        icon: 'text-gray-600',
      };
    case 'review':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        icon: 'text-yellow-600',
      };
    case 'approved':
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        icon: 'text-green-600',
      };
    case 'archived':
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-500',
        border: 'border-gray-200',
        icon: 'text-gray-400',
      };
  }
}

/**
 * Template display info
 */
export function getTemplateInfo(template: SpecTemplate): {
  name: string;
  description: string;
  icon: string;
} {
  switch (template) {
    case 'standard':
      return {
        name: 'Standard PRD',
        description: 'Comprehensive product requirements document',
        icon: '📄',
      };
    case 'feature-launch':
      return {
        name: 'Feature Launch',
        description: 'Detailed spec for launching new features',
        icon: '🚀',
      };
    case 'bug-fix':
      return {
        name: 'Bug Fix',
        description: 'Specification for bug fixes and improvements',
        icon: '🐛',
      };
    case 'api-spec':
      return {
        name: 'API Spec',
        description: 'Technical API specification document',
        icon: '🔌',
      };
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default time saved per spec (in hours)
 */
export const DEFAULT_TIME_SAVED_HOURS = 4;

/**
 * Generation timeout (in milliseconds)
 */
export const GENERATION_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Max spec title length
 */
export const MAX_TITLE_LENGTH = 500;

/**
 * Default context limit for RAG
 */
export const DEFAULT_CONTEXT_LIMIT = 10;

/**
 * Spec status display names
 */
export const SPEC_STATUS_LABELS: Record<SpecStatus, string> = {
  draft: 'Draft',
  review: 'In Review',
  approved: 'Approved',
  archived: 'Archived',
};

/**
 * Generation step display messages
 */
export const GENERATION_STEP_MESSAGES: Record<GenerationStep, string> = {
  idle: 'Preparing...',
  analyzing: 'Analyzing input idea...',
  retrieving: 'Retrieving context from past specs and feedback...',
  generating_problem: 'Generating problem statement...',
  generating_stories: 'Writing user stories...',
  generating_criteria: 'Defining acceptance criteria...',
  generating_edge_cases: 'Identifying edge cases...',
  generating_metrics: 'Setting success metrics...',
  finalizing: 'Final review and formatting...',
  complete: 'Generation complete!',
  error: 'An error occurred during generation',
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Spec error
 */
export class SpecError extends Error {
  constructor(
    message: string,
    public code: SpecErrorCode,
    public specId?: string
  ) {
    super(message);
    this.name = 'SpecError';
  }
}

export type SpecErrorCode =
  | 'SPEC_NOT_FOUND'
  | 'GENERATION_FAILED'
  | 'GENERATION_TIMEOUT'
  | 'CONTEXT_RETRIEVAL_FAILED'
  | 'EXPORT_FAILED'
  | 'INVALID_INPUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED'
  | 'INVALID_TEMPLATE'
  | 'FEEDBACK_NOT_FOUND';
