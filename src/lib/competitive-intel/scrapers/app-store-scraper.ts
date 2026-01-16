import store from 'app-store-scraper';
import { Review } from '../types';

// B2B SaaS product keywords - indicates a business/productivity tool
const B2B_KEYWORDS = [
    'feedback', 'roadmap', 'product', 'team', 'collaboration', 'project',
    'management', 'analytics', 'dashboard', 'workflow', 'enterprise',
    'business', 'saas', 'software', 'productivity', 'task', 'issue',
    'tracking', 'customer', 'support', 'survey', 'integration', 'api'
];

// Consumer app keywords - indicates NOT a B2B tool
const CONSUMER_KEYWORDS = [
    'camera', 'photo', 'video', 'pet', 'baby', 'monitor', 'game', 'gaming',
    'music', 'dating', 'social', 'fitness', 'health', 'exercise', 'recipe',
    'food', 'weather', 'entertainment', 'movie', 'tv', 'streaming'
];

// Preferred app categories for B2B tools
const PREFERRED_CATEGORIES = [
    'Business', 'Productivity', 'Developer Tools', 'Utilities', 'Reference'
];

interface ScoredApp {
    app: {
        id: number;
        title: string;
        description: string;
        primaryGenre?: string;
        developer?: string;
    };
    score: number;
    reasons: string[];
}

function scoreApp(app: { id: number; title: string; description?: string; primaryGenre?: string; developer?: string }, query: string): ScoredApp {
    let score = 0;
    const reasons: string[] = [];
    const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedTitle = app.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const description = (app.description || '').toLowerCase();

    // 1. Title match (required baseline)
    if (normalizedTitle === normalizedQuery) {
        score += 50;
        reasons.push('Exact title match');
    } else if (normalizedTitle.includes(normalizedQuery)) {
        score += 30;
        reasons.push('Partial title match');
    } else if (normalizedQuery.includes(normalizedTitle)) {
        score += 20;
        reasons.push('Query contains title');
    } else {
        // No match at all - disqualify
        return { app: app as ScoredApp['app'], score: -1000, reasons: ['No title match'] };
    }

    // 2. Category preference
    if (app.primaryGenre && PREFERRED_CATEGORIES.some(cat =>
        app.primaryGenre!.toLowerCase().includes(cat.toLowerCase())
    )) {
        score += 25;
        reasons.push(`Preferred category: ${app.primaryGenre}`);
    }

    // 3. B2B keywords in description
    const b2bMatches = B2B_KEYWORDS.filter(kw => description.includes(kw));
    if (b2bMatches.length > 0) {
        score += Math.min(b2bMatches.length * 5, 25);
        reasons.push(`B2B keywords: ${b2bMatches.slice(0, 3).join(', ')}`);
    }

    // 4. Consumer keywords penalty
    const consumerMatches = CONSUMER_KEYWORDS.filter(kw =>
        description.includes(kw) || app.title.toLowerCase().includes(kw)
    );
    if (consumerMatches.length > 0) {
        score -= consumerMatches.length * 15;
        reasons.push(`Consumer keywords (penalty): ${consumerMatches.join(', ')}`);
    }

    // 5. Check if query appears to be asking for a specific type
    const queryLower = query.toLowerCase();
    if (queryLower.includes('feedback') || queryLower.includes('roadmap')) {
        // User is clearly looking for a feedback/roadmap tool
        if (description.includes('feedback') || description.includes('roadmap')) {
            score += 20;
            reasons.push('Query-specific keyword match');
        }
    }

    return { app: app as ScoredApp['app'], score, reasons };
}

export async function scrapeAppStore(appName: string): Promise<Review[]> {
    try {
        // Fetch more results to find the best match
        const searchResults = await store.search({
            term: appName,
            num: 5, // Get top 5 to compare
            country: 'us'
        });

        if (searchResults.length === 0) {
            console.log(`No App Store results for "${appName}"`);
            return [];
        }

        // Score all apps
        const scoredApps: ScoredApp[] = searchResults.map(app => scoreApp(app, appName));

        // Filter out disqualified apps and sort by score
        const validApps = scoredApps
            .filter(sa => sa.score > 0)
            .sort((a, b) => b.score - a.score);

        if (validApps.length === 0) {
            console.log(`No valid App Store matches for "${appName}". Top result was: "${searchResults[0].title}"`);
            return [];
        }

        const bestMatch = validApps[0];
        console.log(`App Store: Selected "${bestMatch.app.title}" for query "${appName}" (score: ${bestMatch.score})`);
        console.log(`  Reasons: ${bestMatch.reasons.join(', ')}`);

        // Log alternatives if any
        if (validApps.length > 1) {
            console.log(`  Alternatives: ${validApps.slice(1).map(a => `${a.app.title}(${a.score})`).join(', ')}`);
        }

        // Get reviews for best matching app
        const reviews = await store.reviews({
            id: bestMatch.app.id,
            country: 'us',
            sort: store.sort.RECENT,
            num: 50
        });

        return reviews.map(r => ({
            text: `${r.title}\n${r.text}`,
            rating: r.score,
            date: new Date(r.updated),
            author: r.userName,
            source: 'app_store' as const,
            source_url: r.url
        }));
    } catch (error) {
        console.error(`Error scraping App Store for ${appName}:`, error);
        return [];
    }
}
