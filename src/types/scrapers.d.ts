declare module 'google-play-scraper' {
    export interface App {
        appId: string;
        title: string;
        url: string;
        icon: string;
        developer: string;
        developerId: string;
        price: string;
        free: boolean;
        summary: string;
        scoreText: string;
        score: number;
        genre: string;
        genreId: string;
    }

    export interface Review {
        id: string;
        userName: string;
        userImage: string;
        date: string;
        score: number;
        scoreText: string;
        url: string;
        title?: string;
        text: string;
        replyDate?: string;
        replyText?: string;
        version?: string;
        thumbsUp: number;
        criterias: any[];
    }

    export const sort: {
        NEWEST: any;
        RATING: any;
        HELPFULNESS: any;
    };

    export function search(options: {
        term: string;
        num?: number;
        lang?: string;
        country?: string;
        fullDetail?: boolean;
        price?: string;
    }): Promise<App[]>;

    export function reviews(options: {
        appId: string;
        lang?: string;
        country?: string;
        sort?: any;
        num?: number;
        paginate?: boolean;
        nextPaginationToken?: string;
    }): Promise<{ data: Review[]; nextPaginationToken?: string }>;
}

declare module 'app-store-scraper' {
    export interface App {
        id: number;
        appId: string;
        title: string;
        url: string;
        description: string;
        icon: string;
        genres: string[];
        genreIds: string[];
        primaryGenre: string;
        primaryGenreId: number;
        contentRating: string;
        languages: string[];
        size: string;
        requiredOsVersion: string;
        released: string;
        updated: string;
        releaseNotes: string;
        version: string;
        price: number;
        currency: string;
        free: boolean;
        developerId: number;
        developer: string;
        developerUrl: string;
        developerWebsite: string;
        score: number;
        reviews: number;
        currentVersionScore: number;
        currentVersionReviews: number;
        screenshots: string[];
        ipadScreenshots: string[];
        appletvScreenshots: string[];
        supportedDevices: string[];
    }

    export interface Review {
        id: string;
        userName: string;
        userUrl: string;
        version: string;
        score: number;
        title: string;
        text: string;
        url: string;
        updated: string;
    }

    export const sort: {
        RECENT: any;
        HELPFUL: any;
    };

    export function search(options: {
        term: string;
        num?: number;
        page?: number;
        country?: string;
        lang?: string;
    }): Promise<App[]>;

    export function reviews(options: {
        id: number | string;
        appId?: string;
        country?: string;
        page?: number;
        sort?: any;
        num?: number;
    }): Promise<Review[]>;
}
