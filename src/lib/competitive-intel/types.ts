export type ReviewSource =
    | 'reddit'
    | 'app_store'
    | 'play_store'
    | 'hacker_news'
    | 'pasted'
    | 'csv_upload';

export interface Review {
    text: string;
    rating: number | null; // 1.0 to 5.0
    date: Date | null;
    author: string | null;
    source: ReviewSource;
    source_url: string | null;

    // Enriched data
    sentiment?: number; // -1.0 to 1.0
    themes?: string[];
}

export interface ScraperResult {
    productName: string;
    normalizedProductName: string;
    source: ReviewSource;
    reviews: Review[];
    error?: string;
}

export interface CollectionResult {
    reviews: Review[];
    failedSources: string[];
}
