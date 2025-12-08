import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { collectReviews } from '@/lib/competitive-intel/collect-reviews';
import { analyzeCompetitors } from '@/lib/competitive-intel/analyze-competitors';
import { Review, ReviewSource } from '@/lib/competitive-intel/types';

// Lazy getter for Supabase client to avoid build-time initialization
function getSupabase(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey);
}

export const maxDuration = 300; // 5 minutes max for scraping

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, sources } = body;
        // sources: ReviewSource[] (e.g. ['reddit', 'app_store'])

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        // 1. Get Session Info
        const { data: session, error: sessionError } = await supabase
            .from('competitive_intel_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) throw new Error('Session not found');

        await supabase
            .from('competitive_intel_sessions')
            .update({ status: 'collecting' })
            .eq('id', sessionId);

        // 2. Identify products to scrape
        const productsToScrape = [session.user_product_name, ...(session.competitor_names || [])].filter(Boolean);
        const scrapeSources = (sources || []) as ReviewSource[];

        // 3. Run Collectors
        for (const product of productsToScrape) {
            if (scrapeSources.length > 0) {
                const result = await collectReviews(product, scrapeSources);

                if (result.reviews.length > 0) {
                    await supabase
                        .from('collected_reviews')
                        .insert(result.reviews.map(r => ({
                            session_id: sessionId,
                            product_name: product,
                            product_name_normalized: product.toLowerCase().trim(),
                            review_text: r.text,
                            rating: r.rating,
                            review_date: r.date,
                            author: r.author,
                            source: r.source,
                            source_url: r.source_url
                        })));
                }
            }
        }

        // 4. Run Analysis
        await supabase
            .from('competitive_intel_sessions')
            .update({ status: 'analyzing' })
            .eq('id', sessionId);

        // Fetch all reviews for this session
        const { data: allReviews } = await supabase
            .from('collected_reviews')
            .select('*')
            .eq('session_id', sessionId);

        if (!allReviews || allReviews.length === 0) {
            await supabase
                .from('competitive_intel_sessions')
                .update({
                    status: 'completed',
                    results: { error: 'No reviews found to analyze' }
                })
                .eq('id', sessionId);
            return NextResponse.json({ status: 'completed', results: null });
        }

        // Group by product
        const reviewsByProduct: Record<string, Review[]> = {};
        allReviews.forEach(r => {
            const p = r.product_name;
            if (!reviewsByProduct[p]) reviewsByProduct[p] = [];
            reviewsByProduct[p].push({
                text: r.review_text,
                rating: r.rating,
                date: r.review_date ? new Date(r.review_date) : null,
                author: r.author,
                source: r.source,
                source_url: r.source_url
            });
        });

        // Run AI
        const analysis = await analyzeCompetitors(
            session.user_product_name,
            session.competitor_names || [],
            reviewsByProduct
        );

        // 5. Save Results
        await supabase
            .from('competitive_intel_sessions')
            .update({
                status: 'completed',
                results: analysis,
                completed_at: new Date()
            })
            .eq('id', sessionId);

        return NextResponse.json({ status: 'success' });

    } catch (error) {
        console.error('Scrape/Analyze process failed:', error);
        // Try to mark session as failed
        try {
            const body = await req.json().catch(() => ({}));
            if (body.sessionId) {
                await supabase
                    .from('competitive_intel_sessions')
                    .update({ status: 'failed' })
                    .eq('id', body.sessionId);
            }
        } catch (e) { }

        return NextResponse.json({ error: 'Process failed' }, { status: 500 });
    }
}
