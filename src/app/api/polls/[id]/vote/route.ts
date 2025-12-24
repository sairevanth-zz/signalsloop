/**
 * Poll Voting API
 * POST /api/polls/[id]/vote - Submit a vote
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import crypto from 'crypto';
import type { SubmitVoteInput } from '@/types/polls';

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * Generate voter hash for deduplication
 * Uses user ID or email for authenticated/email votes
 * For anonymous IP-based votes, generate a unique ID (no deduplication)
 */
function generateVoterHash(
    email?: string,
    ip?: string,
    userAgent?: string,
    userId?: string
): string {
    // For logged-in users, hash by user ID to prevent duplicate votes
    if (userId) {
        return crypto.createHash('sha256').update(`user:${userId}`).digest('hex');
    }
    // For email-based voters, hash by email to prevent duplicate votes
    if (email) {
        return crypto.createHash('sha256').update(`email:${email.toLowerCase()}`).digest('hex');
    }
    // For anonymous IP-based votes, use a unique ID per vote
    // This allows anonymous voting without duplicate key errors
    // The trade-off is that IP-based voters can vote multiple times
    return crypto.randomUUID();
}

// POST /api/polls/[id]/vote
export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id: pollId } = await context.params;
        const body = await request.json() as SubmitVoteInput;

        // Get IP and user agent for anonymous voting
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        const supabase = await createServerClient();
        const serviceClient = getSupabaseServiceRoleClient();

        // Get current user (may be null for anonymous)
        const { data: { user } } = await supabase.auth.getUser();

        // Fetch the poll
        const { data: poll, error: pollError } = await serviceClient
            .from('polls')
            .select(`
        *,
        options:poll_options(id, option_text)
      `)
            .eq('id', pollId)
            .single();

        if (pollError || !poll) {
            return NextResponse.json(
                { error: 'Poll not found' },
                { status: 404 }
            );
        }

        // Validate poll is active
        if (poll.status !== 'active') {
            return NextResponse.json(
                { error: 'This poll is not currently accepting votes' },
                { status: 400 }
            );
        }

        // Check if poll is closed
        if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
            return NextResponse.json(
                { error: 'This poll has closed' },
                { status: 400 }
            );
        }

        // Check anonymous voting permission
        if (!user && !poll.allow_anonymous) {
            return NextResponse.json(
                { error: 'This poll requires authentication' },
                { status: 401 }
            );
        }

        // Generate voter hash - only use for logged-in users or email-based votes
        // IP+UA based hashing is unreliable due to proxy changes on Vercel
        // Ensure empty email string is treated as no email
        const voterEmail = body.voter_email?.trim() || undefined;

        const voterHash = generateVoterHash(
            voterEmail,
            ip,
            userAgent,
            user?.id
        );

        console.log(`[Poll Vote API] Generated hash: ${voterHash.slice(0, 8)}... (UUID format: ${voterHash.includes('-')}, user: ${!!user?.id}, email: ${!!voterEmail})`);

        // Only check for existing votes if user is logged in or provided an email
        // Anonymous IP-based voting cannot be reliably deduplicated on serverless
        if (user?.id || voterEmail) {
            // Use LIKE pattern to find any votes starting with this voter's base hash
            const { data: existingVotes } = await serviceClient!
                .from('poll_votes')
                .select('id')
                .eq('poll_id', pollId)
                .like('voter_hash', `${voterHash}:%`)
                .limit(1);

            if (existingVotes && existingVotes.length > 0) {
                return NextResponse.json(
                    { error: 'You have already voted on this poll' },
                    { status: 409 }
                );
            }
        }

        // Get option IDs from poll
        const validOptionIds = new Set(poll.options.map((o: any) => o.id));

        // Validate based on poll type
        let votesToInsert: any[] = [];

        if (poll.poll_type === 'single_choice') {
            // Single choice - must have exactly one option_id
            if (!body.option_id || !validOptionIds.has(body.option_id)) {
                return NextResponse.json(
                    { error: 'Invalid option selected' },
                    { status: 400 }
                );
            }

            // Use composite hash: voterHash + option_id to ensure uniqueness per vote row
            const compositeHash = `${voterHash}:${body.option_id}`;

            votesToInsert.push({
                poll_id: pollId,
                option_id: body.option_id,
                voter_id: user?.id || null,
                voter_email: voterEmail || null,
                voter_hash: compositeHash,
                explanation_text: body.explanation || null,
                ip_address: ip,
                user_agent: userAgent
            });

        } else if (poll.poll_type === 'multiple_choice') {
            // Multiple choice - can have multiple option_ids
            const optionIds = body.option_ids || (body.option_id ? [body.option_id] : []);

            if (optionIds.length === 0) {
                return NextResponse.json(
                    { error: 'At least one option must be selected' },
                    { status: 400 }
                );
            }

            for (const optId of optionIds) {
                if (!validOptionIds.has(optId)) {
                    return NextResponse.json(
                        { error: `Invalid option: ${optId}` },
                        { status: 400 }
                    );
                }
            }

            votesToInsert = optionIds.map((optId: string) => ({
                poll_id: pollId,
                option_id: optId,
                voter_id: user?.id || null,
                voter_email: voterEmail || null,
                voter_hash: `${voterHash}:${optId}`,
                explanation_text: body.explanation || null,
                ip_address: ip,
                user_agent: userAgent
            }));

        } else if (poll.poll_type === 'ranked') {
            // Ranked choice - must have ranked_options
            if (!body.ranked_options || body.ranked_options.length === 0) {
                return NextResponse.json(
                    { error: 'Ranked options are required' },
                    { status: 400 }
                );
            }

            for (const ranked of body.ranked_options) {
                if (!validOptionIds.has(ranked.option_id)) {
                    return NextResponse.json(
                        { error: `Invalid option: ${ranked.option_id}` },
                        { status: 400 }
                    );
                }
            }

            votesToInsert = body.ranked_options.map((ranked: { option_id: string; rank: number }) => ({
                poll_id: pollId,
                option_id: ranked.option_id,
                voter_id: user?.id || null,
                voter_email: voterEmail || null,
                voter_hash: `${voterHash}:${ranked.option_id}`,
                rank_position: ranked.rank,
                explanation_text: body.explanation || null,
                ip_address: ip,
                user_agent: userAgent
            }));
        }

        // Try to get customer info for revenue weighting
        if (user?.email || body.voter_email) {
            const email = user?.email || body.voter_email;
            const { data: customer } = await serviceClient
                .from('customers')
                .select('id, mrr, segment')
                .eq('email', email)
                .single();

            if (customer) {
                votesToInsert = votesToInsert.map(vote => ({
                    ...vote,
                    customer_id: customer.id,
                    customer_mrr: customer.mrr,
                    customer_segment: customer.segment
                }));
            }
        }

        // Insert votes
        const { data: createdVotes, error: voteError } = await serviceClient
            .from('poll_votes')
            .insert(votesToInsert)
            .select();

        if (voteError) {
            console.error('[Poll Vote API] Error creating vote:', voteError);

            // Check if duplicate vote error
            if (voteError.code === '23505') {
                return NextResponse.json(
                    { error: 'You have already voted on this poll' },
                    { status: 409 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to submit vote' },
                { status: 500 }
            );
        }

        console.log(`[Poll Vote API] ✓ Vote submitted for poll ${pollId} by ${user?.id || voterHash.slice(0, 8)}`);

        // Get updated results if allowed
        let results = null;
        if (poll.show_results_before_vote) {
            const { data } = await serviceClient.rpc('get_poll_results', { p_poll_id: pollId });
            results = data;
        }

        return NextResponse.json({
            success: true,
            votes_count: createdVotes.length,
            results
        }, { status: 201 });

    } catch (error) {
        console.error('[Poll Vote API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
