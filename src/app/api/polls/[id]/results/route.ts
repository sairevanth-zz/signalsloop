/**
 * Poll Results API
 * GET /api/polls/[id]/results - Get poll results with optional revenue weighting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type { PollResults, PollResult, PollResultBySegment } from '@/types/polls';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/polls/[id]/results
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id: pollId } = await context.params;
        const { searchParams } = new URL(request.url);
        const includeSegments = searchParams.get('segments') === 'true';
        const weighted = searchParams.get('weighted') === 'true';

        const supabase = await createServerClient();
        const serviceClient = getSupabaseServiceRoleClient();

        // Get current user (may be null for anonymous)
        const { data: { user } } = await supabase.auth.getUser();

        // Fetch the poll
        const { data: poll, error: pollError } = await serviceClient
            .from('polls')
            .select(`
        *,
        options:poll_options(id, option_text, display_order, vote_count, weighted_vote_count)
      `)
            .eq('id', pollId)
            .single();

        if (pollError || !poll) {
            return NextResponse.json(
                { error: 'Poll not found' },
                { status: 404 }
            );
        }

        // Check access for non-active polls
        if (poll.status !== 'active' && poll.status !== 'closed') {
            // Only project owners can see draft polls
            if (!user) {
                return NextResponse.json(
                    { error: 'Poll not found' },
                    { status: 404 }
                );
            }

            const { data: project } = await serviceClient
                .from('projects')
                .select('owner_id')
                .eq('id', poll.project_id)
                .single();

            if (!project || project.owner_id !== user.id) {
                return NextResponse.json(
                    { error: 'Poll not found' },
                    { status: 404 }
                );
            }
        }

        // Get results using database function
        const { data: resultsData, error: resultsError } = await serviceClient
            .rpc('get_poll_results', { p_poll_id: pollId });

        if (resultsError) {
            console.error('[Poll Results API] Error fetching results:', resultsError);
            return NextResponse.json(
                { error: 'Failed to fetch results' },
                { status: 500 }
            );
        }

        // Calculate totals from results
        const totalVotes = resultsData?.reduce((sum: number, r: any) => sum + Number(r.vote_count), 0) || 0;
        const totalWeighted = resultsData?.reduce((sum: number, r: any) => sum + Number(r.weighted_vote_count), 0) || 0;

        // Count unique voters (extract base hash from composite hash 'base_hash:option_id')
        const { data: voterData } = await serviceClient!
            .from('poll_votes')
            .select('voter_hash')
            .eq('poll_id', pollId);

        // Extract unique base hashes (before the ':' separator)
        const uniqueVoters = new Set(
            (voterData || []).map((v: any) => {
                const parts = v.voter_hash.split(':');
                return parts.length > 1 ? parts.slice(0, -1).join(':') : v.voter_hash;
            })
        ).size;

        // For ranked polls, get average rank per option
        let avgRanks: Record<string, number> = {};
        if (poll.poll_type === 'ranked') {
            const { data: rankData } = await serviceClient!
                .from('poll_votes')
                .select('option_id, rank_position')
                .eq('poll_id', pollId)
                .not('rank_position', 'is', null);

            if (rankData && rankData.length > 0) {
                const rankSums: Record<string, { sum: number; count: number }> = {};
                for (const vote of rankData) {
                    if (!rankSums[vote.option_id]) {
                        rankSums[vote.option_id] = { sum: 0, count: 0 };
                    }
                    rankSums[vote.option_id].sum += vote.rank_position;
                    rankSums[vote.option_id].count += 1;
                }
                for (const [optId, data] of Object.entries(rankSums)) {
                    avgRanks[optId] = data.sum / data.count;
                }
            }
        }

        // Format results with avg_rank for ranked polls
        const results: PollResult[] = (resultsData || []).map((r: any) => ({
            option_id: r.option_id,
            option_text: r.option_text,
            vote_count: Number(r.vote_count),
            weighted_vote_count: Number(r.weighted_vote_count),
            percentage: Number(r.percentage),
            weighted_percentage: Number(r.weighted_percentage),
            avg_rank: avgRanks[r.option_id]
        }));

        // Get segment breakdown if requested
        let bySegment: Record<string, PollResultBySegment[]> | undefined;

        if (includeSegments) {
            const { data: segmentData, error: segmentError } = await serviceClient
                .rpc('get_poll_results_by_segment', { p_poll_id: pollId });

            if (!segmentError && segmentData) {
                bySegment = {};
                for (const row of segmentData) {
                    const segment = row.segment || 'Unknown';
                    if (!bySegment[segment]) {
                        bySegment[segment] = [];
                    }
                    bySegment[segment].push({
                        option_id: row.option_id,
                        option_text: row.option_text,
                        segment,
                        vote_count: Number(row.vote_count),
                        percentage: Number(row.percentage)
                    });
                }
            }
        }

        // Get vote explanations for project owners
        let explanations: { option_id: string; text: string; sentiment?: number }[] = [];
        if (user) {
            const { data: project } = await serviceClient
                .from('projects')
                .select('owner_id')
                .eq('id', poll.project_id)
                .single();

            if (project?.owner_id === user.id) {
                const { data: votes } = await serviceClient
                    .from('poll_votes')
                    .select('option_id, explanation_text, explanation_sentiment')
                    .eq('poll_id', pollId)
                    .not('explanation_text', 'is', null)
                    .limit(100);

                explanations = (votes || []).map(v => ({
                    option_id: v.option_id,
                    text: v.explanation_text,
                    sentiment: v.explanation_sentiment
                }));
            }
        }

        const response: PollResults = {
            poll: {
                id: poll.id,
                project_id: poll.project_id,
                title: poll.title,
                description: poll.description,
                poll_type: poll.poll_type,
                status: poll.status,
                closes_at: poll.closes_at,
                created_by: poll.created_by,
                target_segments: poll.target_segments,
                target_customer_ids: poll.target_customer_ids,
                related_theme_id: poll.related_theme_id,
                related_feedback_ids: poll.related_feedback_ids,
                vote_count: poll.vote_count,
                unique_voter_count: poll.unique_voter_count,
                allow_anonymous: poll.allow_anonymous,
                require_explanation: poll.require_explanation,
                show_results_before_vote: poll.show_results_before_vote,
                created_at: poll.created_at,
                updated_at: poll.updated_at
            },
            results: weighted
                ? results.sort((a, b) => b.weighted_vote_count - a.weighted_vote_count)
                : results,
            by_segment: bySegment,
            total_votes: totalVotes,
            total_weighted: totalWeighted
        };

        return NextResponse.json({
            ...response,
            unique_voters: uniqueVoters,
            explanations: explanations.length > 0 ? explanations : undefined
        });

    } catch (error) {
        console.error('[Poll Results API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
