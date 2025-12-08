import gplay from 'google-play-scraper';
import { Review } from '../types';

export async function scrapePlayStore(appName: string): Promise<Review[]> {
    try {
        // Search for the app
        const searchResults = await gplay.search({
            term: appName,
            num: 1
        });

        if (searchResults.length === 0) return [];

        // Get reviews
        const app = searchResults[0];
        const reviewData = await gplay.reviews({
            appId: app.appId,
            sort: gplay.sort.NEWEST,
            num: 50
        });

        return reviewData.data.map(r => ({
            text: r.text,
            rating: r.score,
            date: new Date(r.date),
            author: r.userName,
            source: 'play_store',
            source_url: r.url
        }));
    } catch (error) {
        console.error(`Error scraping Play Store for ${appName}:`, error);
        return [];
    }
}
