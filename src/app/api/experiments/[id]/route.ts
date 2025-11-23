import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const experimentId = params.id;

    // Fetch experiment with full details using the database function
    const { data, error } = await supabase.rpc('get_experiment_full', {
      p_experiment_id: experimentId,
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch experiment' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      experiment: data.experiment,
      results: data.results || [],
      learnings: data.learnings || [],
    });
  } catch (error) {
    console.error('Error in GET /api/experiments/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const experimentId = params.id;
    const body = await request.json();

    const { status, feature_flag_key, start_date, end_date } = body;

    // Build update object
    const updates: any = {};

    if (status) {
      updates.status = status;

      // Set start_date when moving to running
      if (status === 'running' && !start_date) {
        updates.start_date = new Date().toISOString();
      }

      // Set end_date when completing
      if (status === 'completed' && !end_date) {
        updates.end_date = new Date().toISOString();
      }
    }

    if (feature_flag_key !== undefined) {
      updates.feature_flag_key = feature_flag_key;
    }

    if (start_date !== undefined) {
      updates.start_date = start_date;
    }

    if (end_date !== undefined) {
      updates.end_date = end_date;
    }

    // Update experiment
    const { data, error } = await supabase
      .from('experiments')
      .update(updates)
      .eq('id', experimentId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update experiment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ experiment: data });
  } catch (error) {
    console.error('Error in PATCH /api/experiments/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const experimentId = params.id;

    // Delete experiment (cascade will handle results, learnings, etc.)
    const { error } = await supabase
      .from('experiments')
      .delete()
      .eq('id', experimentId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete experiment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/experiments/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
