import store from 'app-store-scraper';
import { Review } from '../types';

export async function scrapeAppStore(appName: string): Promise<Review[]> {
    try {
        // First, search for the app
        const searchResults = await store.search({
            term: appName,
            num: 1,
            country: 'us'
        });

        if (searchResults.length === 0) return [];

        // Get reviews for best matching app
        const app = searchResults[0];

        // Basic validation: Check if app name roughly matches the query
        // This prevents searching for "Space X" and getting "X" (Twitter)
        const normalizedQuery = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedTitle = app.title.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!normalizedTitle.includes(normalizedQuery)) {
            console.log(`Skipping App Store result: "${app.title}" does not match query "${appName}"`);
            return [];
        }

        const reviews = await store.reviews({
            id: app.id,
            country: 'us',
            sort: store.sort.RECENT,
            num: 50
        });

        return reviews.map(r => ({
            text: `${r.title}\n${r.text}`,
            rating: r.score,
            date: new Date(r.updated), // updated is an ISO string or date
            author: r.userName,
            source: 'app_store',
            source_url: r.url
        }));
    } catch (error) {
        console.error(`Error scraping App Store for ${appName}:`, error);
        return [];
    }
}
