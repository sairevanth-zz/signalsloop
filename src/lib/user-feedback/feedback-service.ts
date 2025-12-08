import { collectReviews } from '../competitive-intel/collect-reviews';
import { clusterFeedback } from './cluster-themes';
import { ClusteringResult, FeedbackItem } from './types';
import { ReviewSource } from '../competitive-intel/types';

export interface AnalysisRequest {
    productName: string;
    sources: {
        reddit: boolean;
        app_store: boolean;
        play_store: boolean;
        hacker_news: boolean;
    };
    pastedFeedback?: string;
    uploadedCsv?: { text: string; source: string; date?: string }[];
}

export async function analyzeFeedback(request: AnalysisRequest): Promise<ClusteringResult> {
    const allFeedback: FeedbackItem[] = [];
    const selectedSources: ReviewSource[] = [];

    // 1. Collect Auto-Scraped Feedback
    if (request.sources.reddit) selectedSources.push('reddit');
    if (request.sources.app_store) selectedSources.push('app_store');
    if (request.sources.play_store) selectedSources.push('play_store');
    if (request.sources.hacker_news) selectedSources.push('hacker_news');

    if (selectedSources.length > 0) {
        const scrapeResult = await collectReviews(request.productName, selectedSources);

        const scrapedItems: FeedbackItem[] = scrapeResult.reviews.map(r => ({
            text: r.text || r.title || '',
            source: r.source,
            date: r.date ? r.date.toISOString() : undefined
        })).filter(i => i.text.length > 10); // Basic filter for empty/short reviews

        allFeedback.push(...scrapedItems);
    }

    // 2. Add Pasted Feedback
    if (request.pastedFeedback) {
        // Simple split by newlines for now, strictly speaking this might split a long review
        // But for "pasted reviews", usually they are distinct blocks. 
        // A better way is to treat the whole block as one source or split by double newline.
        const blocks = request.pastedFeedback.split(/\n\n+/);
        allFeedback.push(...blocks.map(text => ({
            text: text.trim(),
            source: 'pasted',
            date: new Date().toISOString()
        })).filter(t => t.text.length > 0));
    }

    // 3. Add Uploaded CSV
    if (request.uploadedCsv && request.uploadedCsv.length > 0) {
        allFeedback.push(...request.uploadedCsv.map(row => ({
            text: row.text,
            source: row.source || 'csv_upload',
            date: row.date || new Date().toISOString()
        })));
    }

    // 4. Run Clustering
    if (allFeedback.length === 0) {
        throw new Error("No feedback collected to analyze");
    }

    return await clusterFeedback(
        request.productName,
        [...selectedSources, ...(request.pastedFeedback ? ['pasted'] : []), ...(request.uploadedCsv ? ['csv_upload'] : [])],
        allFeedback
    );
}
