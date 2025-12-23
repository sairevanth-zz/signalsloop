/**
 * Hunter Job Queue
 * Utilities for managing the queue-based Hunter architecture
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type { SupabaseClient } from '@supabase/supabase-js';

function getSupabase(): SupabaseClient {
    const client = getServiceRoleClient();
    if (!client) {
        throw new Error('[JobQueue] Supabase client not available - missing env vars');
    }
    return client;
}

// ==========================================
// Types
// ==========================================

export type JobType = 'discovery' | 'relevance' | 'classify';
export type JobStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type ScanStatus = 'running' | 'complete' | 'partial' | 'failed' | 'cancelled';

export interface HunterScan {
    id: string;
    project_id: string;
    status: ScanStatus;
    platforms: Record<string, string>; // {"reddit": "complete", "hn": "pending"}
    total_discovered: number;
    total_relevant: number;
    total_classified: number;
    started_at: string;
    completed_at: string | null;
    triggered_by: string | null;
}

export interface HunterJob {
    id: string;
    scan_id: string;
    project_id: string;
    job_type: JobType;
    platform: string;
    status: JobStatus;
    locked_by: string | null;
    locked_at: string | null;
    attempts: number;
    max_attempts: number;
    error: string | null;
    next_retry_at: string | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}

export interface HunterRawItem {
    id: string;
    scan_id: string;
    project_id: string;
    platform: string;
    external_id: string | null;
    external_url: string | null;
    title: string | null;
    content: string;
    author: string | null;
    posted_at: string | null;
    raw_metadata: Record<string, unknown>;
    relevance_score: number | null;
    relevance_decision: 'include' | 'exclude' | 'human_review' | null;
    relevance_reason: string | null;
    classification: Record<string, unknown> | null;
    stage: 'discovered' | 'filtered' | 'classified' | 'stored' | 'excluded';
    created_at: string;
}

// ==========================================
// Scan Management
// ==========================================

/**
 * Create a new scan with discovery jobs for each platform
 */
export async function createScan(
    projectId: string,
    platforms: string[],
    triggeredBy?: string
): Promise<{ scan: HunterScan; jobs: HunterJob[] }> {
    // Create scan record
    const platformStatus: Record<string, string> = {};
    platforms.forEach(p => platformStatus[p] = 'pending');

    const { data: scan, error: scanError } = await getSupabase()
        .from('hunter_scans')
        .insert({
            project_id: projectId,
            platforms: platformStatus,
            triggered_by: triggeredBy,
        })
        .select()
        .single();

    if (scanError || !scan) {
        throw new Error(`Failed to create scan: ${scanError?.message}`);
    }

    // Create discovery jobs for each platform
    const jobs: HunterJob[] = [];
    for (const platform of platforms) {
        const { data: job, error: jobError } = await getSupabase()
            .from('hunter_jobs')
            .insert({
                scan_id: scan.id,
                project_id: projectId,
                job_type: 'discovery',
                platform,
            })
            .select()
            .single();

        if (jobError || !job) {
            console.error(`Failed to create job for ${platform}:`, jobError);
            continue;
        }
        jobs.push(job);
    }

    return { scan, jobs };
}

/**
 * Get scan by ID
 */
export async function getScan(scanId: string): Promise<HunterScan | null> {
    const { data, error } = await getSupabase()
        .from('hunter_scans')
        .select('*')
        .eq('id', scanId)
        .single();

    if (error) return null;
    return data;
}

/**
 * Get all jobs for a scan
 */
export async function getScanJobs(scanId: string): Promise<HunterJob[]> {
    const { data, error } = await getSupabase()
        .from('hunter_jobs')
        .select('*')
        .eq('scan_id', scanId)
        .order('created_at', { ascending: true });

    if (error) return [];
    return data || [];
}

// ==========================================
// Job Queue Operations
// ==========================================

/**
 * Claim a job atomically (prevents race conditions)
 */
export async function claimJob(jobType: JobType): Promise<HunterJob | null> {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { data, error } = await getSupabase().rpc('claim_hunter_job', {
        p_job_type: jobType,
        p_worker_id: workerId,
    });

    if (error) {
        console.error(`[JobQueue] Error claiming ${jobType} job:`, error);
        return null;
    }

    // RPC returns array, get first item
    return data?.[0] || null;
}

/**
 * Mark job as complete
 */
export async function completeJob(jobId: string): Promise<void> {
    const { error } = await getSupabase().rpc('complete_hunter_job', {
        p_job_id: jobId,
    });

    if (error) {
        console.error(`[JobQueue] Error completing job ${jobId}:`, error);
        throw error;
    }
}

/**
 * Mark job as failed (with optional retry)
 */
export async function failJob(
    jobId: string,
    errorMessage: string,
    shouldRetry: boolean = true
): Promise<void> {
    const { error } = await getSupabase().rpc('fail_hunter_job', {
        p_job_id: jobId,
        p_error: errorMessage,
        p_should_retry: shouldRetry,
    });

    if (error) {
        console.error(`[JobQueue] Error failing job ${jobId}:`, error);
        throw error;
    }
}

/**
 * Create a new job (for stage transitions)
 */
export async function createJob(params: {
    scanId: string;
    projectId: string;
    jobType: JobType;
    platform: string;
}): Promise<HunterJob | null> {
    const { data, error } = await getSupabase()
        .from('hunter_jobs')
        .insert({
            scan_id: params.scanId,
            project_id: params.projectId,
            job_type: params.jobType,
            platform: params.platform,
        })
        .select()
        .single();

    if (error) {
        console.error(`[JobQueue] Error creating job:`, error);
        return null;
    }

    return data;
}

// ==========================================
// Raw Items Management
// ==========================================

/**
 * Store raw items from discovery (with deduplication)
 */
export async function storeRawItems(
    scanId: string,
    projectId: string,
    platform: string,
    items: Array<{
        external_id?: string;
        external_url?: string;
        title?: string;
        content: string;
        author?: string;
        posted_at?: string;
        raw_metadata?: Record<string, unknown>;
    }>
): Promise<number> {
    if (items.length === 0) return 0;

    let storedCount = 0;

    // Insert items one by one to handle duplicates gracefully
    for (const item of items) {
        const row = {
            scan_id: scanId,
            project_id: projectId,
            platform,
            external_id: item.external_id,
            external_url: item.external_url,
            title: item.title,
            content: item.content,
            author: item.author,
            posted_at: item.posted_at,
            raw_metadata: item.raw_metadata || {},
            stage: 'discovered',
        };

        const { error } = await getSupabase()
            .from('hunter_raw_items')
            .insert(row);

        if (error) {
            // Ignore duplicate errors (23505 = unique_violation)
            if (error.code !== '23505') {
                console.error(`[JobQueue] Error storing raw item:`, error);
            }
        } else {
            storedCount++;
        }
    }

    return storedCount;
}

/**
 * Get items for relevance filtering
 */
export async function getItemsForRelevance(
    scanId: string,
    platform: string,
    limit: number = 15
): Promise<HunterRawItem[]> {
    const { data, error } = await getSupabase()
        .from('hunter_raw_items')
        .select('*')
        .eq('scan_id', scanId)
        .eq('platform', platform)
        .eq('stage', 'discovered')
        .limit(limit);

    if (error) return [];
    return data || [];
}

/**
 * Update items with relevance results
 */
export async function updateItemRelevance(
    itemId: string,
    score: number,
    decision: 'include' | 'exclude' | 'human_review',
    reason: string
): Promise<void> {
    const newStage = decision === 'exclude' ? 'excluded' : 'filtered';

    const { error } = await getSupabase()
        .from('hunter_raw_items')
        .update({
            relevance_score: score,
            relevance_decision: decision,
            relevance_reason: reason,
            stage: newStage,
        })
        .eq('id', itemId);

    if (error) {
        console.error(`[JobQueue] Error updating item relevance:`, error);
    }
}

/**
 * Get items for classification
 */
export async function getItemsForClassification(
    scanId: string,
    platform: string,
    limit: number = 10
): Promise<HunterRawItem[]> {
    const { data, error } = await getSupabase()
        .from('hunter_raw_items')
        .select('*')
        .eq('scan_id', scanId)
        .eq('platform', platform)
        .eq('stage', 'filtered')
        .in('relevance_decision', ['include', 'human_review'])
        .limit(limit);

    if (error) return [];
    return data || [];
}

/**
 * Update item with classification
 */
export async function updateItemClassification(
    itemId: string,
    classification: Record<string, unknown>
): Promise<void> {
    const { error } = await getSupabase()
        .from('hunter_raw_items')
        .update({
            classification,
            stage: 'classified',
        })
        .eq('id', itemId);

    if (error) {
        console.error(`[JobQueue] Error updating item classification:`, error);
    }
}

// ==========================================
// Scan Stats & Completion
// ==========================================

/**
 * Update scan stats
 */
export async function updateScanStats(
    scanId: string,
    stats: { discovered?: number; relevant?: number; classified?: number }
): Promise<void> {
    const { error } = await getSupabase().rpc('update_hunter_scan_stats', {
        p_scan_id: scanId,
        p_discovered: stats.discovered || 0,
        p_relevant: stats.relevant || 0,
        p_classified: stats.classified || 0,
    });

    if (error) {
        console.error(`[JobQueue] Error updating scan stats:`, error);
    }
}

/**
 * Platform status priority for monotonic updates
 * Status can only go forward, never backward
 */
const STATUS_PRIORITY: Record<string, number> = {
    'pending': 0,
    'queued': 1,
    'discovering': 2,
    'filtering': 3,
    'filtered': 3,
    'classifying': 4,
    'complete': 5,
    'failed': 6,
};

/**
 * Update platform status in scan (monotonic - only allows forward transitions)
 */
export async function updatePlatformStatus(
    scanId: string,
    platform: string,
    newStatus: string
): Promise<void> {
    // First get current platforms
    const { data: scan } = await getSupabase()
        .from('hunter_scans')
        .select('platforms')
        .eq('id', scanId)
        .single();

    if (!scan) return;

    const currentStatus = scan.platforms?.[platform] || 'pending';
    const currentPriority = STATUS_PRIORITY[currentStatus] ?? 0;
    const newPriority = STATUS_PRIORITY[newStatus] ?? 0;

    // Only allow forward transitions (or same status)
    // Exception: 'failed' can always be set
    if (newPriority < currentPriority && newStatus !== 'failed') {
        console.log(`[JobQueue] Ignoring backward status: ${platform} ${currentStatus} → ${newStatus}`);
        return;
    }

    const platforms = { ...scan.platforms, [platform]: newStatus };

    const { error } = await getSupabase()
        .from('hunter_scans')
        .update({ platforms })
        .eq('id', scanId);

    if (error) {
        console.error(`[JobQueue] Error updating platform status:`, error);
    }
}

/**
 * Update platform integration stats (total_scans, successful_scans, etc.)
 * Called after discovery completes for a platform
 */
export async function updatePlatformIntegrationStats(
    projectId: string,
    platform: string,
    itemsFound: number,
    success: boolean
): Promise<void> {
    // Get current integration
    const { data: integration, error: fetchError } = await getSupabase()
        .from('platform_integrations')
        .select('id, total_scans, successful_scans, failed_scans, total_items_found')
        .eq('project_id', projectId)
        .eq('platform_type', platform)
        .single();

    if (fetchError || !integration) {
        console.error(`[JobQueue] Error fetching integration for stats:`, fetchError);
        return;
    }

    // Update stats
    const { error } = await getSupabase()
        .from('platform_integrations')
        .update({
            total_scans: (integration.total_scans || 0) + 1,
            successful_scans: success ? (integration.successful_scans || 0) + 1 : integration.successful_scans || 0,
            failed_scans: success ? integration.failed_scans || 0 : (integration.failed_scans || 0) + 1,
            total_items_found: (integration.total_items_found || 0) + itemsFound,
            last_scan_at: new Date().toISOString(),
        })
        .eq('id', integration.id);

    if (error) {
        console.error(`[JobQueue] Error updating platform stats:`, error);
    } else {
        console.log(`[JobQueue] Updated ${platform} stats: +${itemsFound} items, success=${success}`);
    }
}

/**
 * Check if scan is complete and send notification
 */
export async function checkScanComplete(scanId: string): Promise<boolean> {
    const { data, error } = await getSupabase().rpc('check_hunter_scan_complete', {
        p_scan_id: scanId,
    });

    if (error) {
        console.error(`[JobQueue] Error checking scan complete:`, error);
        return false;
    }

    // If scan just completed, send email notification
    if (data === true) {
        try {
            await sendScanCompleteNotification(scanId);
        } catch (notifyError) {
            console.error(`[JobQueue] Error sending scan completion notification:`, notifyError);
        }
    }

    return data || false;
}

/**
 * Send email notification when scan completes
 */
async function sendScanCompleteNotification(scanId: string): Promise<void> {
    // Get scan details
    const { data: scan } = await getSupabase()
        .from('hunter_scans')
        .select('*, projects(name, owner_id)')
        .eq('id', scanId)
        .single();

    if (!scan) return;

    // Get user email
    const { data: userData } = await getSupabase().auth.admin.getUserById(scan.projects?.owner_id);

    if (!userData?.user?.email) {
        console.log(`[JobQueue] No email found for user ${scan.projects?.owner_id}`);
        return;
    }

    const projectName = scan.projects?.name || 'your project';
    const stats = {
        discovered: scan.total_discovered || 0,
        relevant: scan.total_relevant || 0,
        classified: scan.total_classified || 0,
    };

    // Send via Resend or internal email API
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://signalsloop.com'}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: userData.user.email,
            subject: `🎯 Hunter Scan Complete for ${projectName}`,
            template: 'scan-complete',
            data: {
                projectName,
                scanId,
                stats,
                dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://signalsloop.com'}/${encodeURIComponent(projectName.toLowerCase().replace(/\s+/g, '-'))}/hunter`,
            },
        }),
    }).catch(err => {
        console.error('[JobQueue] Failed to send email:', err);
    });

    console.log(`[JobQueue] Sent scan completion email to ${userData.user.email}`);
}

// ==========================================
// Cleanup
// ==========================================

/**
 * Recover stale jobs (crashed workers)
 */
export async function recoverStaleJobs(): Promise<number> {
    const { data, error } = await getSupabase().rpc('recover_stale_hunter_jobs');

    if (error) {
        console.error(`[JobQueue] Error recovering stale jobs:`, error);
        return 0;
    }

    return data || 0;
}
