/**
 * Evidence Thread Service
 * 
 * Gathers relevant evidence for spec creation based on user intent.
 * Pulls from feedback, competitors, metrics, and churn signals.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return _supabase;
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
 * Gather evidence related to the user's intent
 */
export async function gatherEvidence(
    request: GatherEvidenceRequest
): Promise<GatherEvidenceResponse> {
    const { projectId, intent, limit = 10 } = request;
    const supabase = getSupabase();
    const evidence: EvidenceThread[] = [];

    console.log('[EvidenceService] Gathering evidence for:', { projectId, intent });

    try {
        // 1. Get ALL recent posts and filter client-side (most reliable approach)
        try {
            console.log('[EvidenceService] Fetching posts for project:', projectId);

            const { data: allPosts, error: postsError } = await supabase
                .from('posts')
                .select('id, title, content, vote_count, status, created_at')
                .eq('project_id', projectId)
                .order('vote_count', { ascending: false })
                .limit(50);

            if (postsError) {
                console.error('[EvidenceService] Error fetching posts:', postsError);
            }

            console.log('[EvidenceService] Found posts:', allPosts?.length || 0);

            if (allPosts && allPosts.length > 0) {
                // Client-side filtering by intent keywords
                const intentLower = intent.toLowerCase();
                const keywords = intentLower
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(word => word.length > 2);

                console.log('[EvidenceService] Search keywords:', keywords);

                const matchingPosts = allPosts.filter(post => {
                    const titleLower = (post.title || '').toLowerCase();
                    const contentLower = (post.content || '').toLowerCase();

                    // Check if any keyword matches title or content
                    return keywords.some(keyword =>
                        titleLower.includes(keyword) || contentLower.includes(keyword)
                    );
                });

                console.log('[EvidenceService] Matching posts:', matchingPosts.length);

                matchingPosts.slice(0, 5).forEach((post: any) => {
                    evidence.push({
                        id: `feedback-${post.id}`,
                        type: 'feedback',
                        title: post.title || 'User Feedback',
                        summary: (post.content || '').substring(0, 150) + '...',
                        relevance: 0.8,
                        sourceId: post.id,
                        details: {
                            votes: post.vote_count,
                            status: post.status,
                            fullContent: post.content,
                        },
                        createdAt: new Date(post.created_at),
                    });
                });
            }
        } catch (e) {
            console.error('[EvidenceService] Error in posts search:', e);
        }

        // 2. Get feedback themes (if table exists)
        try {
            console.log('[EvidenceService] Fetching themes for project:', projectId);

            const { data: allThemes, error: themesError } = await supabase
                .from('feedback_themes')
                .select('id, name, feedback_count, sentiment_score, keywords, created_at')
                .eq('project_id', projectId)
                .order('feedback_count', { ascending: false })
                .limit(20);

            if (themesError) {
                console.error('[EvidenceService] Error fetching themes:', themesError);
            }

            console.log('[EvidenceService] Found themes:', allThemes?.length || 0);

            if (allThemes && allThemes.length > 0) {
                const intentLower = intent.toLowerCase();
                const keywords = intentLower
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(word => word.length > 2);

                const matchingThemes = allThemes.filter(theme => {
                    const nameLower = (theme.name || '').toLowerCase();
                    return keywords.some(keyword => nameLower.includes(keyword));
                });

                console.log('[EvidenceService] Matching themes:', matchingThemes.length);

                matchingThemes.slice(0, 3).forEach((theme: any) => {
                    evidence.push({
                        id: `theme-${theme.id}`,
                        type: 'theme',
                        title: theme.name || 'Unnamed Theme',
                        summary: `${theme.feedback_count || 0} mentions, sentiment: ${(theme.sentiment_score || 0).toFixed(2)}`,
                        relevance: 0.75,
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
            console.error('[EvidenceService] Error searching themes:', e);
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
            console.error('[EvidenceService] Error fetching competitor intel:', e);
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
            console.error('[EvidenceService] Error fetching churn signals:', e);
        }

        // Sort by relevance and limit
        evidence.sort((a, b) => b.relevance - a.relevance);
        const limitedEvidence = evidence.slice(0, limit);

        console.log('[EvidenceService] Total evidence found:', evidence.length);

        return {
            success: true,
            evidence: limitedEvidence,
            totalFound: evidence.length,
        };
    } catch (error) {
        console.error('[EvidenceService] Error gathering evidence:', error);
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

