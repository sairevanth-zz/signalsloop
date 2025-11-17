/**
 * User Stories Types
 * Type definitions for AI-generated user stories, sprint planning, and Jira export
 */

import { Theme } from './themes';

// ============================================================================
// Database Types
// ============================================================================

export type StoryPriority = 'critical' | 'high' | 'medium' | 'low';
export type SprintStatus = 'backlog' | 'to_do' | 'in_progress' | 'done';
export type SprintPhase = 'planning' | 'active' | 'completed' | 'cancelled';

/**
 * Acceptance criterion object
 */
export interface AcceptanceCriterion {
  id: string;
  text: string;
  details: string[];
}

/**
 * Definition of done checklist item
 */
export interface DefinitionOfDoneItem {
  id: string;
  text: string;
  completed?: boolean;
}

/**
 * Team member information
 */
export interface TeamMember {
  id: string;
  name: string;
  capacity: number; // points they can handle
  avatar?: string;
}

/**
 * User story - AI-generated from themes
 */
export interface UserStory {
  id: string;
  project_id: string;
  theme_id?: string;

  // Story content (As a... I want... So that...)
  title: string;
  user_type: string; // "enterprise customer", "mobile user", etc.
  user_goal: string; // "I want to..."
  user_benefit: string; // "So that..."
  full_story: string; // Complete formatted story

  // Acceptance criteria
  acceptance_criteria: AcceptanceCriterion[];

  // Story points & estimation
  story_points?: number; // 1, 2, 3, 5, 8, 13, 21
  complexity_score?: number; // 0-1
  uncertainty_score?: number; // 0-1
  effort_score?: number; // 0-1
  estimation_reasoning?: string;

  // Metadata
  labels: string[];
  technical_notes?: string;
  definition_of_done: DefinitionOfDoneItem[];
  priority_level: StoryPriority;

  // Jira integration
  jira_issue_key?: string;
  jira_issue_id?: string;
  exported_to_jira: boolean;
  export_timestamp?: string;
  jira_export_error?: string;

  // Sprint planning
  sprint_id?: string;
  sprint_status: SprintStatus;
  assigned_to?: string;

  // AI generation
  generated_by_ai: boolean;
  generation_model: string;
  generation_timestamp: string;
  generation_tokens_used?: number;
  manually_edited: boolean;
  manually_edited_at?: string;

  // Supporting feedback
  supporting_feedback_ids: string[];
  feedback_count: number;

  created_at: string;
  updated_at: string;
}

/**
 * User story with enriched data from view
 */
export interface UserStoryWithDetails extends UserStory {
  theme_name?: string;
  theme_frequency?: number;
  sprint_name?: string;
  sprint_number?: number;
  sprint_start_date?: string;
  sprint_end_date?: string;
  project_name?: string;
  linked_feedback_count: number;
}

/**
 * Sprint for capacity planning
 */
export interface Sprint {
  id: string;
  project_id: string;

  // Sprint identification
  sprint_number: number;
  sprint_name: string;
  sprint_goal?: string;

  // Sprint timeline
  start_date: string;
  end_date: string;

  // Capacity planning
  capacity_points: number; // Team's velocity
  current_points: number; // Sum of story points in sprint
  committed_points: number; // Points when sprint started

  // Sprint status
  status: SprintPhase;

  // Team information
  team_members: TeamMember[];

  // Sprint retrospective
  completed_points: number;
  retrospective_notes?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Sprint with planning metrics (from view)
 */
export interface SprintPlanningView extends Sprint {
  story_count: number;
  completed_story_count: number;
  completed_points: number;
  capacity_percentage: number;
}

/**
 * Story template for reusability
 */
export interface StoryTemplate {
  id: string;
  project_id: string;

  // Template identification
  template_name: string;
  description?: string;
  category?: string; // 'performance', 'feature', 'bug', 'infrastructure'

  // Template content (supports {{placeholder}} syntax)
  user_type_template?: string;
  goal_template?: string;
  benefit_template?: string;
  acceptance_criteria_templates: AcceptanceCriterion[];
  default_labels: string[];
  default_story_points?: number;

  // Usage tracking
  usage_count: number;
  last_used_at?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Story generation log entry
 */
export interface StoryGenerationLog {
  id: string;
  project_id: string;
  theme_id?: string;
  user_story_id?: string;

  // Generation details
  model_used: string;
  tokens_used?: number;
  generation_time_ms?: number;
  prompt_tokens?: number;
  completion_tokens?: number;

  // Result
  success: boolean;
  error_message?: string;
  error_stack?: string;

  // Input context
  input_context: Record<string, any>;

  created_at: string;
}

/**
 * Link between story and feedback
 */
export interface StoryFeedbackLink {
  story_id: string;
  feedback_id: string;
  relevance_score?: number; // 0-1
  created_at: string;
}

// ============================================================================
// AI Generation Types
// ============================================================================

/**
 * Input for generating a user story from a theme
 */
export interface GenerateStoryInput {
  theme: Theme;
  feedbackItems: FeedbackItemForStory[];
  projectContext?: string;
  template?: StoryTemplate;
  customInstructions?: string;
}

/**
 * Feedback item formatted for story generation
 */
export interface FeedbackItemForStory {
  id: string;
  content: string;
  title?: string;
  sentiment_score?: number;
  classification?: string;
  created_at: string;
  author_username?: string;
}

/**
 * AI-generated story result
 */
export interface GeneratedStoryResult {
  title: string;
  user_type: string;
  user_goal: string;
  user_benefit: string;
  full_story: string;
  acceptance_criteria: AcceptanceCriterion[];
  suggested_story_points: number;
  complexity_score: number;
  uncertainty_score: number;
  effort_score: number;
  estimation_reasoning: string;
  suggested_labels: string[];
  technical_notes: string;
  definition_of_done: DefinitionOfDoneItem[];
  priority_level: StoryPriority;
}

/**
 * Story point estimation factors
 */
export interface EstimationFactors {
  complexity: number; // 0-1
  uncertainty: number; // 0-1
  effort: number; // 0-1
  dependencies?: string[];
  risks?: string[];
}

/**
 * Estimated story points with reasoning
 */
export interface StoryPointEstimate {
  story_points: number; // 1, 2, 3, 5, 8, 13, 21
  confidence: number; // 0-1
  factors: EstimationFactors;
  reasoning: string;
  alternative_estimates?: Array<{
    points: number;
    scenario: string;
  }>;
}

// ============================================================================
// Sprint Planning Types
// ============================================================================

/**
 * Sprint capacity analysis
 */
export interface SprintCapacity {
  total_capacity: number;
  used_capacity: number;
  available_capacity: number;
  capacity_percentage: number;
  over_capacity: boolean;
  team_members: Array<{
    member: TeamMember;
    assigned_points: number;
    capacity_used: number;
  }>;
}

/**
 * Sprint velocity data
 */
export interface SprintVelocity {
  sprint_id: string;
  sprint_number: number;
  planned_points: number;
  completed_points: number;
  completion_percentage: number;
  velocity: number;
}

/**
 * Team velocity trends
 */
export interface VelocityTrend {
  average_velocity: number;
  trend_direction: 'up' | 'down' | 'stable';
  recent_sprints: SprintVelocity[];
  suggested_capacity: number;
}

/**
 * Story assignment recommendation
 */
export interface StoryAssignment {
  story_id: string;
  recommended_assignee?: string;
  reasoning: string;
  workload_balance_score: number; // 0-1
}

// ============================================================================
// Jira Export Types
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
  sprint_id?: string;
  components?: string[];
  fix_versions?: string[];
}

/**
 * Jira export result
 */
export interface JiraExportResult {
  success: boolean;
  issue_key: string;
  issue_id: string;
  issue_url: string;
  error?: string;
}

/**
 * Bulk Jira export result
 */
export interface BulkJiraExportResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    story_id: string;
    story_title: string;
    result: JiraExportResult;
  }>;
}

/**
 * Jira issue field mapping
 */
export interface JiraFieldMapping {
  summary: string;
  description: string; // ADF or markdown
  priority?: string;
  labels: string[];
  acceptance_criteria?: string;
  story_points?: number;
  epic_link?: string;
  assignee?: string;
  sprint?: string;
  custom_fields?: Record<string, any>;
}

// ============================================================================
// Statistics & Analytics Types
// ============================================================================

/**
 * User story statistics
 */
export interface UserStoryStats {
  total_stories: number;
  stories_in_backlog: number;
  stories_in_sprint: number;
  total_story_points: number;
  exported_to_jira: number;
  ai_generated: number;
  manually_edited: number;
  avg_story_points: number;
}

/**
 * Sprint statistics
 */
export interface SprintStats {
  total_stories: number;
  total_points: number;
  completed_stories: number;
  completed_points: number;
  in_progress_stories: number;
  todo_stories: number;
  capacity: number;
  capacity_used_percent: number;
}

/**
 * Story distribution by priority
 */
export interface StoryDistributionByPriority {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/**
 * Story distribution by points
 */
export interface StoryDistributionByPoints {
  [points: number]: number; // e.g., { 1: 5, 2: 10, 3: 8, 5: 12, ... }
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface StoryGeneratorProps {
  theme: Theme;
  projectId: string;
  onStoryGenerated?: (story: UserStory) => void;
  onCancel?: () => void;
  className?: string;
}

export interface StoryCardProps {
  story: UserStory | UserStoryWithDetails;
  onEdit?: (story: UserStory) => void;
  onExport?: (story: UserStory) => void;
  onDelete?: (story: UserStory) => void;
  showActions?: boolean;
  showTheme?: boolean;
  showSprint?: boolean;
  className?: string;
}

export interface StoryEditorProps {
  story?: UserStory;
  projectId: string;
  themeId?: string;
  onSave: (story: Partial<UserStory>) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

export interface SprintPlanningProps {
  projectId: string;
  sprint?: Sprint;
  backlogStories?: UserStory[];
  onStoryMoved?: (storyId: string, newSprintId: string | null, newStatus: SprintStatus) => void;
  className?: string;
}

export interface StoryTemplatesProps {
  projectId: string;
  onTemplateSelected?: (template: StoryTemplate) => void;
  className?: string;
}

export interface AcceptanceCriteriaEditorProps {
  criteria: AcceptanceCriterion[];
  onChange: (criteria: AcceptanceCriterion[]) => void;
  readOnly?: boolean;
  className?: string;
}

export interface StoryPointsSelectorProps {
  value?: number;
  onChange: (points: number) => void;
  showEstimation?: boolean;
  estimationFactors?: EstimationFactors;
  className?: string;
}

export interface SprintCapacityViewProps {
  sprint: Sprint;
  stories: UserStory[];
  onCapacityAdjust?: (newCapacity: number) => void;
  className?: string;
}

export interface BacklogViewProps {
  projectId: string;
  stories: UserStory[];
  onStoryClick?: (story: UserStory) => void;
  onDragStart?: (story: UserStory) => void;
  className?: string;
}

export interface VelocityChartProps {
  sprints: Sprint[];
  velocityData: SprintVelocity[];
  showTrend?: boolean;
  className?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to generate user story from theme
 */
export interface GenerateStoryRequest {
  theme_id: string;
  project_id: string;
  template_id?: string;
  custom_instructions?: string;
  include_feedback_ids?: string[];
}

/**
 * Response from story generation
 */
export interface GenerateStoryResponse {
  success: boolean;
  story?: UserStory;
  generation_log_id?: string;
  tokens_used?: number;
  generation_time_ms?: number;
  error?: string;
}

/**
 * Request to create/update user story
 */
export interface SaveStoryRequest {
  story: Partial<UserStory>;
  project_id: string;
}

/**
 * Response from save story
 */
export interface SaveStoryResponse {
  success: boolean;
  story?: UserStory;
  error?: string;
}

/**
 * Request to export story to Jira
 */
export interface ExportToJiraRequest {
  story_id: string;
  config: JiraExportConfig;
}

/**
 * Response from Jira export
 */
export interface ExportToJiraResponse {
  success: boolean;
  result?: JiraExportResult;
  error?: string;
}

/**
 * Request to bulk export stories to Jira
 */
export interface BulkExportToJiraRequest {
  story_ids: string[];
  config: JiraExportConfig;
  create_epic?: boolean;
  epic_name?: string;
}

/**
 * Response from bulk Jira export
 */
export interface BulkExportToJiraResponse {
  success: boolean;
  result?: BulkJiraExportResult;
  epic?: {
    key: string;
    url: string;
  };
  error?: string;
}

/**
 * Request to create/update sprint
 */
export interface SaveSprintRequest {
  sprint: Partial<Sprint>;
  project_id: string;
}

/**
 * Response from save sprint
 */
export interface SaveSprintResponse {
  success: boolean;
  sprint?: Sprint;
  error?: string;
}

/**
 * Request to assign story to sprint
 */
export interface AssignStoryToSprintRequest {
  story_id: string;
  sprint_id?: string; // null to move to backlog
  sprint_status?: SprintStatus;
}

/**
 * Response from assign story
 */
export interface AssignStoryToSprintResponse {
  success: boolean;
  story?: UserStory;
  error?: string;
}

/**
 * Request to get story stats
 */
export interface GetStoryStatsRequest {
  project_id: string;
}

/**
 * Response with story stats
 */
export interface GetStoryStatsResponse {
  success: boolean;
  stats?: UserStoryStats;
  error?: string;
}

/**
 * Request to get sprint stats
 */
export interface GetSprintStatsRequest {
  sprint_id: string;
}

/**
 * Response with sprint stats
 */
export interface GetSprintStatsResponse {
  success: boolean;
  stats?: SprintStats;
  error?: string;
}

// ============================================================================
// Drag and Drop Types
// ============================================================================

/**
 * Draggable story item
 */
export interface DraggableStory {
  story: UserStory;
  index: number;
  sourceColumn: 'backlog' | 'to_do' | 'in_progress' | 'done';
}

/**
 * Drop target
 */
export interface DropTarget {
  sprint_id?: string;
  sprint_status: SprintStatus;
}

/**
 * Drag and drop result
 */
export interface DragDropResult {
  story_id: string;
  from: {
    sprint_id?: string;
    status: SprintStatus;
  };
  to: {
    sprint_id?: string;
    status: SprintStatus;
  };
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

/**
 * Story filter options
 */
export interface StoryFilter {
  search?: string;
  priority?: StoryPriority[];
  story_points?: number[];
  sprint_status?: SprintStatus[];
  sprint_id?: string;
  theme_id?: string;
  exported_to_jira?: boolean;
  has_jira_link?: boolean;
  generated_by_ai?: boolean;
  manually_edited?: boolean;
  labels?: string[];
  date_range?: {
    start: Date;
    end: Date;
  };
}

/**
 * Story sort options
 */
export type StorySortOption =
  | 'priority_desc'
  | 'priority_asc'
  | 'story_points_desc'
  | 'story_points_asc'
  | 'created_desc'
  | 'created_asc'
  | 'updated_desc'
  | 'updated_asc'
  | 'title_asc'
  | 'title_desc';

/**
 * Story list options
 */
export interface StoryListOptions {
  filter?: StoryFilter;
  sort?: StorySortOption;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Story points values (Fibonacci scale)
 */
export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;
export type StoryPointValue = typeof STORY_POINTS[number];

/**
 * Priority color scheme
 */
export interface PriorityColorScheme {
  bg: string;
  text: string;
  border: string;
  icon: string;
}

/**
 * Get priority color scheme
 */
export function getPriorityColorScheme(priority: StoryPriority): PriorityColorScheme {
  switch (priority) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        text: 'text-red-900',
        border: 'border-red-300',
        icon: 'text-red-600',
      };
    case 'high':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-900',
        border: 'border-orange-300',
        icon: 'text-orange-600',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-900',
        border: 'border-yellow-300',
        icon: 'text-yellow-600',
      };
    case 'low':
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-900',
        border: 'border-gray-300',
        icon: 'text-gray-600',
      };
  }
}

/**
 * Sprint status color scheme
 */
export interface SprintStatusColorScheme {
  bg: string;
  text: string;
  border: string;
}

/**
 * Get sprint status color scheme
 */
export function getSprintStatusColorScheme(status: SprintStatus): SprintStatusColorScheme {
  switch (status) {
    case 'backlog':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
      };
    case 'to_do':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
      };
    case 'in_progress':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
      };
    case 'done':
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
      };
  }
}

/**
 * Format user story as text
 */
export function formatUserStory(story: UserStory): string {
  return `As a ${story.user_type}, I want ${story.user_goal} so that ${story.user_benefit}.`;
}

/**
 * Calculate story complexity from scores
 */
export function calculateComplexity(
  complexity: number,
  uncertainty: number,
  effort: number
): 'low' | 'medium' | 'high' | 'very_high' {
  const average = (complexity + uncertainty + effort) / 3;

  if (average < 0.3) return 'low';
  if (average < 0.6) return 'medium';
  if (average < 0.8) return 'high';
  return 'very_high';
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default story points for estimation
 */
export const DEFAULT_STORY_POINTS = 3;

/**
 * Maximum story points (epic threshold)
 */
export const MAX_STORY_POINTS = 21;

/**
 * Minimum confidence for AI generation
 */
export const MIN_AI_CONFIDENCE = 0.7;

/**
 * Default sprint duration in days
 */
export const DEFAULT_SPRINT_DURATION = 14;

/**
 * Story generation models
 */
export const GENERATION_MODELS = {
  GPT4: 'gpt-4',
  GPT4_TURBO: 'gpt-4-turbo',
  GPT4O: 'gpt-4o',
} as const;

/**
 * User story configuration
 */
export const USER_STORY_CONFIG = {
  minAcceptanceCriteria: 3,
  maxAcceptanceCriteria: 8,
  maxTitleLength: 100,
  maxDescriptionLength: 2000,
  maxTechnicalNotesLength: 1000,
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * User story error
 */
export class UserStoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public storyId?: string
  ) {
    super(message);
    this.name = 'UserStoryError';
  }
}

/**
 * Sprint planning error
 */
export class SprintPlanningError extends Error {
  constructor(
    message: string,
    public code: string,
    public sprintId?: string
  ) {
    super(message);
    this.name = 'SprintPlanningError';
  }
}

/**
 * Story generation error
 */
export class StoryGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public themeId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'StoryGenerationError';
  }
}

export type UserStoryErrorCode =
  | 'STORY_NOT_FOUND'
  | 'THEME_NOT_FOUND'
  | 'GENERATION_FAILED'
  | 'INVALID_STORY_POINTS'
  | 'INVALID_ACCEPTANCE_CRITERIA'
  | 'SPRINT_OVER_CAPACITY'
  | 'EXPORT_FAILED'
  | 'UNAUTHORIZED';
