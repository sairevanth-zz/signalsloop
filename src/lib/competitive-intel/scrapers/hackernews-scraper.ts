import { Review } from '../types';

interface AlgoliaHit {
    objectID: string;
    created_at: string;
    author: string;
    title?: string; // Story title
    story_title?: string; // Title of story if this is a comment
    comment_text?: string;
    story_text?: string;
    points?: number;
}

interface AlgoliaResponse {
    hits: AlgoliaHit[];
}

export async function scrapeHackerNews(productName: string): Promise<Review[]> {
    try {
        const searchUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(productName)}&tags=(story,comment)&hitsPerPage=50`;

        const response = await fetch(searchUrl);
        if (!response.ok) return [];

        const data = await response.json() as AlgoliaResponse;

        // Filter for relevant hits
        // Comments are more valuable than just story links

        return data.hits
            .filter(hit => hit.comment_text || hit.story_text || (hit.title && hit.points && hit.points > 5))
            .map(hit => {
                const text = hit.comment_text || hit.story_text || hit.title || "";

                return {
                    text,
                    rating: null, // HN doesn't have ratings
                    date: new Date(hit.created_at),
                    author: hit.author,
                    source: 'hacker_news',
                    source_url: `https://news.ycombinator.com/item?id=${hit.objectID}`
                };
            });
    } catch (error) {
        console.error(`Error scraping HN for ${productName}:`, error);
        return [];
    }
}
