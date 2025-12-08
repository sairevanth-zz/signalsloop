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
