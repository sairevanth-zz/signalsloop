import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    // Validate required fields
    const {
      roadmap_title,
      roadmap_description,
      roadmap_logo_url,
      roadmap_brand_color,
      roadmap_custom_css,
      roadmap_show_progress,
      roadmap_show_effort,
      roadmap_show_timeline,
      roadmap_allow_anonymous_votes,
      roadmap_subscribe_emails
    } = body;

    // Validate color format if provided
    if (roadmap_brand_color && !/^#[0-9A-F]{6}$/i.test(roadmap_brand_color)) {
      return NextResponse.json(
        { error: 'Invalid brand color format. Use hex format (e.g., #3B82F6)' },
        { status: 400 }
      );
    }

    // Validate logo URL if provided
    if (roadmap_logo_url) {
      try {
        new URL(roadmap_logo_url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid logo URL format' },
          { status: 400 }
        );
      }
    }

    // Check if project exists and user has permission
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // TODO: Add authentication check here
    // For now, we'll allow updates (in production, verify user is project owner)

    // Update project with roadmap settings
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        roadmap_title: roadmap_title || null,
        roadmap_description: roadmap_description || null,
        roadmap_logo_url: roadmap_logo_url || null,
        roadmap_brand_color: roadmap_brand_color || '#3B82F6',
        roadmap_custom_css: roadmap_custom_css || null,
        roadmap_show_progress: roadmap_show_progress ?? true,
        roadmap_show_effort: roadmap_show_effort ?? true,
        roadmap_show_timeline: roadmap_show_timeline ?? true,
        roadmap_allow_anonymous_votes: roadmap_allow_anonymous_votes ?? true,
        roadmap_subscribe_emails: roadmap_subscribe_emails ?? false,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating roadmap settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update roadmap settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Roadmap settings updated successfully'
    });

  } catch (error) {
    console.error('Roadmap settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Get project roadmap settings
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        roadmap_title,
        roadmap_description,
        roadmap_logo_url,
        roadmap_brand_color,
        roadmap_custom_css,
        roadmap_show_progress,
        roadmap_show_effort,
        roadmap_show_timeline,
        roadmap_allow_anonymous_votes,
        roadmap_subscribe_emails
      `)
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        roadmap_title: project.roadmap_title,
        roadmap_description: project.roadmap_description,
        roadmap_logo_url: project.roadmap_logo_url,
        roadmap_brand_color: project.roadmap_brand_color,
        roadmap_custom_css: project.roadmap_custom_css,
        roadmap_show_progress: project.roadmap_show_progress,
        roadmap_show_effort: project.roadmap_show_effort,
        roadmap_show_timeline: project.roadmap_show_timeline,
        roadmap_allow_anonymous_votes: project.roadmap_allow_anonymous_votes,
        roadmap_subscribe_emails: project.roadmap_subscribe_emails
      }
    });

  } catch (error) {
    console.error('Roadmap settings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
