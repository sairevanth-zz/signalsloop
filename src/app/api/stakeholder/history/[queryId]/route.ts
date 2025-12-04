/**
 * Stakeholder Query Delete API
 * Delete individual queries from history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { queryId: string } }
) {
  try {
    const queryId = params.queryId;

    if (!queryId) {
      return NextResponse.json(
        { error: 'Missing queryId parameter' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete the query
    const { error } = await supabase
      .from('stakeholder_queries')
      .delete()
      .eq('id', queryId);

    if (error) {
      throw new Error(`Failed to delete query: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Query deleted successfully'
    });
  } catch (error) {
    console.error('[Delete Query API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
