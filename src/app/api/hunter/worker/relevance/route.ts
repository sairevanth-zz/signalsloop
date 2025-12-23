/**
 * Relevance Worker
 * Processes relevance filtering for discovered items
 * Triggered by cron every minute
 */

import { NextResponse } from 'next/server';
import {
    claimJob,
    completeJob,
    failJob,
    createJob,
    getItemsForRelevance,
    updateItemRelevance,
    updateScanStats,
    updatePlatformStatus,
} from '@/lib/hunters/job-queue';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { filterByRelevance } from '@/lib/hunters/relevance-filter';
import { buildProductContext } from '@/lib/hunters/product-context';
import type { RawFeedback, PlatformType } from '@/types/hunter';

export const maxDuration = 55;
export const dynamic = 'force-dynamic';

export async function GET() {
    return POST();
}

export async function POST() {
    console.log('[Relevance Worker] Starting...');

    try {
        // Claim a pending relevance job
        const job = await claimJob('relevance');

        if (!job) {
            console.log('[Relevance Worker] No pending jobs');
            return NextResponse.json({ processed: 0, message: 'No pending jobs' });
        }

        console.log(`[Relevance Worker] Claimed job ${job.id} for ${job.platform}`);
        await updatePlatformStatus(job.scan_id, job.platform, 'filtering');

        const supabase = getServiceRoleClient();
        if (!supabase) {
            console.error('[Relevance Worker] FAILED: Supabase client not available');
            await failJob(job.id, 'Supabase client not available', false);
            return NextResponse.json({ processed: 0, error: 'No supabase client' });
        }

        // Get hunter config
        const { data: config, error: configError } = await supabase
            .from('hunter_configs')
            .select('*')
            .eq('project_id', job.project_id)
            .limit(1)
            .maybeSingle();

        if (configError || !config) {
            console.error('[Relevance Worker] FAILED: No hunter config:', configError);
            await failJob(job.id, `No hunter config found`, false);
            return NextResponse.json({ processed: 0, error: 'No config' });
        }

        // Get items to filter (reduced batch size to avoid timeout)
        const items = await getItemsForRelevance(job.scan_id, job.platform, 5);

        if (items.length === 0) {
            console.log(`[Relevance Worker] No items to filter for ${job.platform} - marking complete`);
            await completeJob(job.id);
            // Update platform status and check if scan is done
            await updatePlatformStatus(job.scan_id, job.platform, 'complete');
            const { checkScanComplete } = await import('@/lib/hunters/job-queue');
            await checkScanComplete(job.scan_id);
            return NextResponse.json({ processed: 1, filtered: 0 });
        }

        console.log(`[Relevance Worker] Filtering ${items.length} items for ${job.platform}`);

        // Build product context (with null safety for all fields)
        const context = buildProductContext({
            companyName: config.company_name || '',
            productDescription: config.product_description || '',
            productTagline: config.product_tagline || '',
            websiteUrl: config.website_url || '',
            nameVariations: config.name_variations || [],
            keywords: config.keywords || [],
            excludedKeywords: config.excluded_keywords || [],
            competitors: config.competitors || [],
            targetAudience: config.target_audience || '',
            productCategory: config.product_category || '',
        });

        // Convert to RawFeedback format for filter
        const rawFeedback: RawFeedback[] = items.map(item => ({
            content: item.content,
            title: item.title || '',
            platform: item.platform as PlatformType,
            platform_id: item.external_id || item.id,
            platform_url: item.external_url || '',
            author_username: item.author || undefined,
            discovered_at: new Date(item.created_at),
        }));

        // Run relevance filter with timeout
        const filterPromise = filterByRelevance(rawFeedback, context);
        const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Relevance filter timeout')), 45000)
        );

        const result = await Promise.race([filterPromise, timeoutPromise]);

        if (!result) {
            await failJob(job.id, 'Relevance filter timeout');
            return NextResponse.json({ processed: 0, error: 'Timeout' });
        }

        // Update items with relevance scores
        // FilterBatchResult has: included, excluded, needsReview arrays
        let relevantCount = 0;

        // Process included items
        for (const itemResult of result.included) {
            const originalItem = items.find(i =>
                i.external_id === itemResult.item.platform_id || i.id === itemResult.item.platform_id
            );

            if (originalItem) {
                await updateItemRelevance(
                    originalItem.id,
                    itemResult.relevanceScore,
                    'include',
                    itemResult.reasoning
                );
                relevantCount++;
            }
        }

        // Process needsReview items
        for (const itemResult of result.needsReview) {
            const originalItem = items.find(i =>
                i.external_id === itemResult.item.platform_id || i.id === itemResult.item.platform_id
            );

            if (originalItem) {
                await updateItemRelevance(
                    originalItem.id,
                    itemResult.relevanceScore,
                    'human_review',
                    itemResult.reasoning
                );
                relevantCount++;
            }
        }

        // Process excluded items
        for (const itemResult of result.excluded) {
            const originalItem = items.find(i =>
                i.external_id === itemResult.item.platform_id || i.id === itemResult.item.platform_id
            );

            if (originalItem) {
                await updateItemRelevance(
                    originalItem.id,
                    itemResult.relevanceScore,
                    'exclude',
                    itemResult.reasoning
                );
            }
        }

        // Update scan stats
        await updateScanStats(job.scan_id, { relevant: relevantCount });

        // Create classify job if we have relevant items
        if (relevantCount > 0) {
            await createJob({
                scanId: job.scan_id,
                projectId: job.project_id,
                jobType: 'classify',
                platform: job.platform,
            });
            console.log(`[Relevance Worker] Created classify job for ${job.platform}`);
        }

        // Mark job complete
        await completeJob(job.id);
        await updatePlatformStatus(job.scan_id, job.platform, 'filtered');

        console.log(`[Relevance Worker] Filtered ${items.length} items, ${relevantCount} relevant`);

        return NextResponse.json({
            processed: 1,
            platform: job.platform,
            total: items.length,
            relevant: relevantCount,
        });
    } catch (error) {
        console.error('[Relevance Worker] Error:', error);
        return NextResponse.json({
            processed: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
