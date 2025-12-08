import { Review } from '../types';
import { getOpenAI } from '@/lib/openai-client';

interface ParseResponse {
    reviews: {
        text: string;
        rating: number | null;
        date: string | null;
        author: string | null;
    }[];
    detected_source: string;
    detected_product: string | null;
    parse_confidence: number;
}

export async function parsePastedText(text: string, productName?: string): Promise<Review[]> {
    try {
        if (!text || text.trim().length < 10) return [];

        const completion = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Parse this pasted text into individual product reviews.
          
          For each review found, extract:
          - text: The main review content (combine pros/cons if separate)
          - rating: Star rating if visible (1-5), null if not found
          - date: Review date if visible, null if not found
          - author: Reviewer name/title if visible, null if not found
          
          Respond with JSON:
          {
            "reviews": [
              { "text": "...", "rating": 4.5, "date": "2024-03-15", "author": "..." }
            ],
            "detected_source": "string",
            "detected_product": "string",
            "parse_confidence": number (0-1)
          }`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}') as ParseResponse;

        if (!result.reviews || result.reviews.length === 0) {
            // Fallback: treat as single review
            return [{
                text: text,
                rating: null,
                date: new Date(),
                author: 'Anonymous',
                source: 'pasted',
                source_url: null
            }];
        }

        return result.reviews.map(r => ({
            text: r.text,
            rating: r.rating,
            date: r.date ? new Date(r.date) : new Date(),
            author: r.author || 'Anonymous',
            source: 'pasted',
            source_url: null
        }));

    } catch (error) {
        console.error('Error parsing pasted text:', error);
        // Fallback on error
        return [{
            text: text,
            rating: null,
            date: new Date(),
            author: 'Anonymous',
            source: 'pasted',
            source_url: null
        }];
    }
}
