/**
 * Evidence Thread Service
 * 
 * Gathers relevant evidence for spec creation based on user intent.
 * Pulls from feedback, competitors, metrics, and churn signals.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Lazy initialization
let _supabase: SupabaseClient | null = null;
let _openai: OpenAI | null = null;

function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return _supabase;
}

function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

export type EvidenceType = 'feedback' | 'competitor' | 'metric' | 'churn_signal' | 'theme';

export interface EvidenceThread {
    id: string;
    type: EvidenceType;
    title: string;
    summary: string;
    relevance: number; // 0-1
    sourceId: string;
    sourceUrl?: string;
    details: Record<string, any>;
    createdAt: Date;
}

export interface GatherEvidenceRequest {
    projectId: string;
    intent: string;
    limit?: number;
}

export interface GatherEvidenceResponse {
    success: boolean;
    evidence: EvidenceThread[];
    totalFound: number;
    error?: string;
}

/**
 * Generate embedding for intent text
 */
async function generateEmbedding(text: string): Promise<number[]> {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
    });
    return response.data[0].embedding;
}

/**
 * Gather evidence related to the user's intent
 */
export async function gatherEvidence(
    request: GatherEvidenceRequest
): Promise<GatherEvidenceResponse> {
    const { projectId, intent, limit = 10 } = request;
    const supabase = getSupabase();
    const evidence: EvidenceThread[] = [];

    // Extract key search terms from intent
    const searchTerms = intent
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 5);

    try {
        // 1. Search feedback themes by name/keywords matching
        try {
            // Build OR conditions for theme name matching
            let themeQuery = supabase
                .from('feedback_themes')
                .select('id, name, feedback_count, sentiment_score, keywords, created_at')
                .eq('project_id', projectId);

            // Search with ILIKE for each term
            if (searchTerms.length > 0) {
                const orConditions = searchTerms.map(term => `name.ilike.%${term}%`).join(',');
                themeQuery = themeQuery.or(orConditions);
            }

            const { data: themes, error: themeError } = await themeQuery
                .order('feedback_count', { ascending: false })
                .limit(5);

            if (themes && themes.length > 0) {
                themes.forEach((theme: any) => {
                    evidence.push({
                        id: `theme-${theme.id}`,
                        type: 'theme',
                        title: theme.name || 'Unnamed Theme',
                        summary: `${theme.feedback_count || 0} mentions, sentiment: ${(theme.sentiment_score || 0).toFixed(2)}`,
                        relevance: 0.8,
                        sourceId: theme.id,
                        details: {
                            feedbackCount: theme.feedback_count,
                            sentimentScore: theme.sentiment_score,
                            keywords: theme.keywords,
                        },
                        createdAt: new Date(theme.created_at),
                    });
                });
            }
        } catch (e) {
            console.error('Error searching themes:', e);
        }

        // 2. Get relevant feedback posts using ILIKE search
        try {
            // Try each search term and collect results
            for (const term of searchTerms.slice(0, 3)) {
                const { data: posts, error } = await supabase
                    .from('posts')
                    .select('id, title, content, votes, status, created_at')
                    .eq('project_id', projectId)
                    .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
                    .order('votes', { ascending: false })
                    .limit(3);

                if (posts && posts.length > 0) {
                    posts.forEach((post: any) => {
                        // Avoid duplicates
                        if (!evidence.find(e => e.id === `feedback-${post.id}`)) {
                            evidence.push({
                                id: `feedback-${post.id}`,
                                type: 'feedback',
                                title: post.title || 'User Feedback',
                                summary: (post.content || '').substring(0, 150) + '...',
                                relevance: 0.75,
                                sourceId: post.id,
                                details: {
                                    votes: post.votes,
                                    status: post.status,
                                    fullContent: post.content,
                                },
                                createdAt: new Date(post.created_at),
                            });
                        }
                    });
                }
            }

            // Also try full intent as a phrase (first 50 chars)
            const phraseSearch = intent.substring(0, 50).replace(/'/g, "''");
            const { data: phrasePosts } = await supabase
                .from('posts')
                .select('id, title, content, votes, status, created_at')
                .eq('project_id', projectId)
                .or(`title.ilike.%${phraseSearch}%,content.ilike.%${phraseSearch}%`)
                .order('votes', { ascending: false })
                .limit(3);

            if (phrasePosts && phrasePosts.length > 0) {
                phrasePosts.forEach((post: any) => {
                    if (!evidence.find(e => e.id === `feedback-${post.id}`)) {
                        evidence.push({
                            id: `feedback-${post.id}`,
                            type: 'feedback',
                            title: post.title || 'User Feedback',
                            summary: (post.content || '').substring(0, 150) + '...',
                            relevance: 0.85,
                            sourceId: post.id,
                            details: {
                                votes: post.votes,
                                status: post.status,
                                fullContent: post.content,
                            },
                            createdAt: new Date(post.created_at),
                        });
                    }
                });
            }
        } catch (e) {
            console.error('Error searching feedback:', e);
        }

        // 3. Get competitor intel (keep existing logic)
        try {
            const { data: competitors } = await supabase
                .from('competitor_updates')
                .select('id, competitor_id, update_type, title, summary, created_at')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(3);

            if (competitors && competitors.length > 0) {
                competitors.forEach((update: any) => {
                    evidence.push({
                        id: `competitor-${update.id}`,
                        type: 'competitor',
                        title: `${update.update_type}: ${update.title}`,
                        summary: update.summary || 'Competitor activity detected',
                        relevance: 0.5,
                        sourceId: update.id,
                        details: {
                            updateType: update.update_type,
                        },
                        createdAt: new Date(update.created_at),
                    });
                });
            }
        } catch (e) {
            console.error('Error fetching competitor intel:', e);
        }

        // 4. Get churn signals (keep existing logic)
        try {
            const { data: churnData } = await supabase
                .from('customer_health')
                .select('id, health_score, health_grade, risk_signals, health_summary')
                .eq('project_id', projectId)
                .in('health_grade', ['critical', 'at_risk'])
                .limit(3);

            if (churnData && churnData.length > 0) {
                evidence.push({
                    id: `churn-summary`,
                    type: 'churn_signal',
                    title: `${churnData.length} At-Risk Customers`,
                    summary: churnData[0]?.health_summary || 'Customers showing churn signals',
                    relevance: 0.6,
                    sourceId: 'aggregate',
                    details: {
                        count: churnData.length,
                        avgHealthScore: churnData.reduce((sum, c) => sum + (c.health_score || 0), 0) / churnData.length,
                    },
                    createdAt: new Date(),
                });
            }
        } catch (e) {
            console.error('Error fetching churn signals:', e);
        }

        // Sort by relevance and limit
        evidence.sort((a, b) => b.relevance - a.relevance);
        const limitedEvidence = evidence.slice(0, limit);

        return {
            success: true,
            evidence: limitedEvidence,
            totalFound: evidence.length,
        };
    } catch (error) {
        console.error('Error gathering evidence:', error);
        return {
            success: false,
            evidence: [],
            totalFound: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Refresh evidence for an existing spec
 */
export async function refreshEvidenceForSpec(
    specId: string,
    projectId: string
): Promise<GatherEvidenceResponse> {
    const supabase = getSupabase();

    // Get spec content
    const { data: spec, error } = await supabase
        .from('specs')
        .select('title, content')
        .eq('id', specId)
        .single();

    if (error || !spec) {
        return {
            success: false,
            evidence: [],
            totalFound: 0,
            error: 'Spec not found',
        };
    }

    // Use title + content as intent
    const intent = `${spec.title} ${(spec.content || '').substring(0, 500)}`;

    return gatherEvidence({ projectId, intent });
}
