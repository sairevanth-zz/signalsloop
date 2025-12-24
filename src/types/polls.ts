/**
 * Smart Polls & Surveys Type Definitions
 * Types for the poll and survey feature
 */

// ============================================================================
// Poll Types
// ============================================================================

export type PollType = 'single_choice' | 'multiple_choice' | 'ranked';
export type PollStatus = 'draft' | 'active' | 'closed';

export interface Poll {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    poll_type: PollType;
    status: PollStatus;
    closes_at?: string;
    created_by?: string;
    target_segments: string[];
    target_customer_ids: string[];
    related_theme_id?: string;
    related_feedback_ids: string[];
    vote_count: number;
    unique_voter_count: number;
    allow_anonymous: boolean;
    require_explanation: boolean;
    show_results_before_vote: boolean;
    created_at: string;
    updated_at: string;
}

export interface PollWithOptions extends Poll {
    options: PollOption[];
}

export interface PollOption {
    id: string;
    poll_id: string;
    option_text: string;
    description?: string;
    linked_feedback_ids: string[];
    ai_generated: boolean;
    display_order: number;
    vote_count: number;
    weighted_vote_count: number;
    created_at: string;
}

export interface PollVote {
    id: string;
    poll_id: string;
    option_id: string;
    voter_id?: string;
    voter_email?: string;
    voter_hash: string;
    rank_position?: number;
    explanation_text?: string;
    explanation_sentiment?: number;
    customer_id?: string;
    customer_mrr?: number;
    customer_segment?: string;
    created_at: string;
}

// Input types for API calls
export interface CreatePollInput {
    title: string;
    description?: string;
    poll_type: PollType;
    closes_at?: string;
    target_segments?: string[];
    target_customer_ids?: string[];
    related_theme_id?: string;
    related_feedback_ids?: string[];
    allow_anonymous?: boolean;
    require_explanation?: boolean;
    show_results_before_vote?: boolean;
    options: CreatePollOptionInput[];
}

export interface CreatePollOptionInput {
    option_text: string;
    description?: string;
    linked_feedback_ids?: string[];
    ai_generated?: boolean;
}

export interface UpdatePollInput {
    title?: string;
    description?: string;
    status?: PollStatus;
    closes_at?: string;
    target_segments?: string[];
    allow_anonymous?: boolean;
    require_explanation?: boolean;
    show_results_before_vote?: boolean;
}

export interface SubmitVoteInput {
    option_id: string; // For single choice
    option_ids?: string[]; // For multiple choice
    ranked_options?: { option_id: string; rank: number }[]; // For ranked choice
    explanation?: string;
    voter_email?: string;
}

// Results types
export interface PollResult {
    option_id: string;
    option_text: string;
    vote_count: number;
    weighted_vote_count: number;
    percentage: number;
    weighted_percentage: number;
}

export interface PollResultBySegment {
    option_id: string;
    option_text: string;
    segment: string;
    vote_count: number;
    percentage: number;
}

export interface PollResults {
    poll: Poll;
    results: PollResult[];
    by_segment?: Record<string, PollResultBySegment[]>;
    total_votes: number;
    total_weighted: number;
}

// AI Suggestion types
export interface SuggestedPollOption {
    option_text: string;
    description: string;
    confidence: number;
    supporting_feedback_ids: string[];
    source_theme?: string;
}

export interface PollSuggestionRequest {
    project_id: string;
    theme_id?: string;
    context?: string;
    num_options?: number;
}

export interface PollSuggestionResponse {
    options: SuggestedPollOption[];
    suggested_title?: string;
    suggested_description?: string;
}

// ============================================================================
// Survey Types
// ============================================================================

export type SurveyStatus = 'draft' | 'active' | 'closed';
export type QuestionType = 'text' | 'single_select' | 'multi_select' | 'rating' | 'nps';

export interface Survey {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    status: SurveyStatus;
    thank_you_message: string;
    closes_at?: string;
    created_by?: string;
    response_count: number;
    completion_rate?: number;
    avg_sentiment?: number;
    allow_anonymous: boolean;
    created_at: string;
    updated_at: string;
}

export interface SurveyWithQuestions extends Survey {
    questions: SurveyQuestion[];
}

export interface SurveyQuestion {
    id: string;
    survey_id: string;
    question_type: QuestionType;
    question_text: string;
    options?: string[]; // For select types
    required: boolean;
    min_value?: number; // For rating
    max_value?: number;
    min_label?: string;
    max_label?: string;
    display_order: number;
    created_at: string;
}

export interface SurveyResponse {
    id: string;
    survey_id: string;
    respondent_id?: string;
    respondent_email?: string;
    respondent_hash: string;
    answers: Record<string, string | number | string[]>; // question_id -> answer
    sentiment_score?: number;
    detected_themes?: string[];
    customer_id?: string;
    customer_mrr?: number;
    customer_segment?: string;
    started_at: string;
    completed_at?: string;
    is_complete: boolean;
    created_at: string;
}

// Input types
export interface CreateSurveyInput {
    title: string;
    description?: string;
    thank_you_message?: string;
    closes_at?: string;
    allow_anonymous?: boolean;
    questions: CreateSurveyQuestionInput[];
}

export interface CreateSurveyQuestionInput {
    question_type: QuestionType;
    question_text: string;
    options?: string[];
    required?: boolean;
    min_value?: number;
    max_value?: number;
    min_label?: string;
    max_label?: string;
}

export interface UpdateSurveyInput {
    title?: string;
    description?: string;
    status?: SurveyStatus;
    thank_you_message?: string;
    closes_at?: string;
    allow_anonymous?: boolean;
}

export interface SubmitSurveyResponseInput {
    answers: Record<string, string | number | string[]>;
    respondent_email?: string;
}

// Analysis types
export interface SurveyAnalysis {
    survey: Survey;
    response_count: number;
    completion_rate: number;
    avg_sentiment: number;
    question_summaries: QuestionSummary[];
    detected_themes: ThemeSummary[];
}

export interface QuestionSummary {
    question_id: string;
    question_text: string;
    question_type: QuestionType;
    response_count: number;
    // For select types
    option_counts?: Record<string, number>;
    // For rating/nps types
    average_score?: number;
    score_distribution?: Record<number, number>;
    // For text types
    sample_responses?: string[];
    sentiment_avg?: number;
}

export interface ThemeSummary {
    theme: string;
    count: number;
    sentiment_avg: number;
    sample_quotes: string[];
}
