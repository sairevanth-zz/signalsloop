import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parsePastedText } from '@/lib/competitive-intel/parsers/text-parser';
import { parseCSV } from '@/lib/competitive-intel/parsers/csv-parser';
import { ReviewSource } from '@/lib/competitive-intel/types';

// Lazy getter for Supabase client to avoid build-time initialization
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, product, content, type } = body;
        // type: 'text' | 'csv'

        if (!sessionId || !product || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let reviews = [];
        let source: ReviewSource = 'pasted';

        if (type === 'csv') {
            reviews = parseCSV(content);
            source = 'csv_upload';
        } else {
            reviews = await parsePastedText(content, product);
            source = 'pasted';
        }

        if (reviews.length === 0) {
            return NextResponse.json({ error: 'No reviews found in content' }, { status: 400 });
        }

        const supabase = getSupabase();
        const { error } = await supabase
            .from('collected_reviews')
            .insert(reviews.map(r => ({
                session_id: sessionId,
                product_name: product,
                product_name_normalized: product.toLowerCase().trim(),
                review_text: r.text,
                rating: r.rating,
                review_date: r.date,
                author: r.author,
                source: source,
                source_url: r.source_url
            })));

        if (error) throw error;

        return NextResponse.json({ count: reviews.length });
    } catch (error) {
        console.error('Error adding reviews:', error);
        return NextResponse.json({ error: 'Failed to add reviews' }, { status: 500 });
    }
}
