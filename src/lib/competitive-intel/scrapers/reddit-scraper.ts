import { Review } from '../types';

interface RedditChild {
    kind: string;
    data: {
        title?: string;
        selftext?: string;
        body?: string; // for comments
        score: number;
        created_utc: number;
        permalink: string;
        subreddit: string;
        num_comments?: number;
        author: string;
    };
}

interface RedditResponse {
    data: {
        children: RedditChild[];
    };
}

export async function scrapeReddit(productName: string): Promise<Review[]> {
    try {
        // Search Reddit for product mentions (posts)
        const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(productName)}&sort=relevance&limit=50&t=year`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'SignalsLoop/1.0 (Product Feedback Tool)'
            }
        });

        if (!response.ok) {
            console.error(`Reddit scraping failed for ${productName}: ${response.statusText}`);
            return [];
        }

        const data = await response.json() as RedditResponse;
        const items = data.data.children.map(c => c.data);

        const reviews: Review[] = items
            .filter(item => {
                // Filter out items with no content
                const text = item.selftext || item.body || item.title || "";
                return text.length > 20 && item.score > 1; // Basic quality filter
            })
            .map(item => {
                const text = [item.title, item.selftext, item.body].filter(Boolean).join('\n\n');

                // Normalize score to 1-5 rating (heuristics)
                // High score = likely validation/good sentiment or highly controversial
                // This is imperfect but better than null
                let rating = null;
                if (item.score > 100) rating = 4.5;
                else if (item.score > 20) rating = 4.0;
                else if (item.score > 5) rating = 3.5;
                else rating = 3.0;

                return {
                    text,
                    rating, // heuristic
                    date: new Date(item.created_utc * 1000),
                    author: `u/${item.author}`,
                    source: 'reddit',
                    source_url: `https://www.reddit.com${item.permalink}`
                };
            });

        return reviews;
    } catch (error) {
        console.error(`Error scraping Reddit for ${productName}:`, error);
        return [];
    }
}
