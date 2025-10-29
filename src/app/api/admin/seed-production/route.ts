import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEMO_BOARD_ID = '00000000-0000-0000-0000-000000000001';

const demoPosts = [
  { id: '00000000-0000-0000-0000-000000000001', category: 'Feature Request', priority_score: 8.5, author_name: 'Sarah Chen' },
  { id: '00000000-0000-0000-0000-000000000002', category: 'Bug', priority_score: 9.2, author_name: 'Alex Kumar' },
  { id: '00000000-0000-0000-0000-000000000003', category: 'Integration', priority_score: 7.8, author_name: 'Taylor Martinez' },
  { id: '00000000-0000-0000-0000-000000000004', category: 'UI/UX', priority_score: 6.5, author_name: 'Jordan Lee' },
  { id: '00000000-0000-0000-0000-000000000005', category: 'Feature Request', priority_score: 7.2, author_name: 'Morgan Davis' },
  { id: '00000000-0000-0000-0000-000000000006', category: 'Feature Request', priority_score: 5.5, author_name: 'Riley Thompson' },
  { id: '00000000-0000-0000-0000-000000000007', category: 'Improvement', priority_score: 8.0, author_name: 'Casey Wright' },
  { id: '00000000-0000-0000-0000-000000000008', category: 'Feature Request', priority_score: 7.5, author_name: 'Sam Rivera' },
  { id: '00000000-0000-0000-0000-000000000009', category: 'Integration', priority_score: 8.3, author_name: 'Jamie Park' },
  { id: '00000000-0000-0000-0000-000000000010', category: 'Improvement', priority_score: 6.8, author_name: 'Avery Brooks' }
];

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - you can remove this or add proper auth
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== 'seed-production-now') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let updated = 0;
    let errors = [];

    for (const post of demoPosts) {
      const { error } = await supabase
        .from('posts')
        .update({
          category: post.category,
          priority_score: post.priority_score,
          author_name: post.author_name
        })
        .eq('id', post.id)
        .eq('board_id', DEMO_BOARD_ID);

      if (error) {
        errors.push({ id: post.id, error: error.message });
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      total: demoPosts.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Seed production error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
