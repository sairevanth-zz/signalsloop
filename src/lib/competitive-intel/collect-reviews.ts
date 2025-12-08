import { createClient } from '@supabase/supabase-js';
import { CollectionResult, Review, ReviewSource, ScraperResult } from './types';
import { scrapeReddit } from './scrapers/reddit-scraper';
import { scrapeAppStore } from './scrapers/app-store-scraper';
import { scrapePlayStore } from './scrapers/play-store-scraper';
import { scrapeHackerNews } from './scrapers/hackernews-scraper';

// Initialize Supabase client for server-side usage (assuming env vars are present)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const scrapers: Record<string, (name: string) => Promise<Review[]>> = {
    reddit: scrapeReddit,
    app_store: scrapeAppStore,
    play_store: scrapePlayStore,
    hacker_news: scrapeHackerNews,
};

export async function collectReviews(
    productName: string,
    sources: ReviewSource[]
): Promise<CollectionResult> {
    const normalizedProductName = productName.toLowerCase().trim();
    let reviews: Review[] = [];
    const failedSources: string[] = [];

    // 1. Check Cache
    const { data: cachedData } = await supabase
        .from('scrape_cache')
        .select('*')
        .eq('product_name_normalized', normalizedProductName)
        .gt('expires_at', new Date().toISOString());

    const cachedSources = new Set(cachedData?.map(c => c.source) || []);

    if (cachedData) {
        cachedData.forEach(entry => {
            // Cast JSONB back to Review[] - verify structure implicitly
            const cachedReviews = entry.reviews as unknown as Review[];
            // Fix dates from JSON
            cachedReviews.forEach(r => {
                if (r.date) r.date = new Date(r.date);
            });
            reviews.push(...cachedReviews);
        });
    }

    // 2. Identify missing sources (excluding upload/paste)
    const sourcesToScrape = sources.filter(s =>
        !cachedSources.has(s) &&
        s !== 'pasted' &&
        s !== 'csv_upload'
    );

    // 3. Scrape in parallel
    const scrapePromises = sourcesToScrape.map(async (source) => {
        try {
            const scraper = scrapers[source];
            if (!scraper) throw new Error(`No scraper for ${source}`);

            const newReviews = await scraper(productName);

            // Cache results
            if (newReviews.length > 0) {
                await supabase.from('scrape_cache').upsert({
                    product_name_normalized: normalizedProductName,
                    source: source,
                    reviews: newReviews, // Automatic JSON stringify
                    scraped_at: new Date(),
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h TTL
                }, { onConflict: 'product_name_normalized, source' });
            }

            return {
                source,
                reviews: newReviews,
                success: true
            };
        } catch (error) {
            console.error(`Scrape failed for ${source}:`, error);
            return {
                source,
                reviews: [],
                success: false
            };
        }
    });

    const results = await Promise.all(scrapePromises);

    // 4. Combine results
    results.forEach(res => {
        if (res.success) {
            reviews.push(...res.reviews);
        } else {
            failedSources.push(res.source);
        }
    });

    return {
        reviews,
        failedSources
    };
}
