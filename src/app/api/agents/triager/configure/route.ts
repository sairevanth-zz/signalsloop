import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client'

/**
 * GET /api/agents/triager/configure
 * Fetch PM assignment rules for a project
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch PM assignments
    const { data: pmAssignments, error } = await supabase
      .from('pm_assignments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pmAssignments: pmAssignments || [] })

  } catch (error: any) {
    console.error('[API] Triager configure GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/agents/triager/configure
 * Create or update PM assignment rule
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      projectId,
      pmUserId,
      pmName,
      pmEmail,
      productAreas,
      priorityThreshold,
      customerSegments,
      autoAssignEnabled,
      autoMergeEnabled,
      autoMergeThreshold,
      notifyOnAssignment,
      notifyOnMerge,
      dailyDigestEnabled,
      id // Optional: if updating existing rule
    } = body

    // Validate required fields
    if (!projectId || !pmName || !pmEmail) {
      return NextResponse.json(
        { error: 'projectId, pmName, and pmEmail are required' },
        { status: 400 }
      )
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Upsert PM assignment
    const assignmentData = {
      project_id: projectId,
      pm_user_id: pmUserId || user.id,
      pm_name: pmName,
      pm_email: pmEmail,
      product_areas: productAreas || [],
      priority_threshold: priorityThreshold || 3,
      customer_segments: customerSegments || [],
      auto_assign_enabled: autoAssignEnabled ?? true,
      auto_merge_enabled: autoMergeEnabled ?? false,
      auto_merge_confidence_threshold: autoMergeThreshold ?? 0.85,
      notify_on_assignment: notifyOnAssignment ?? true,
      notify_on_merge: notifyOnMerge ?? true,
      daily_digest_enabled: dailyDigestEnabled ?? true,
      updated_at: new Date().toISOString()
    }

    let query = supabase
      .from('pm_assignments')

    if (id) {
      // Update existing
      const { data, error } = await query
        .update(assignmentData)
        .eq('id', id)
        .eq('project_id', projectId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } else {
      // Insert new
      const { data, error } = await query
        .insert(assignmentData)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

  } catch (error: any) {
    console.error('[API] Triager configure POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/agents/triager/configure
 * Delete PM assignment rule
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assignmentId = req.nextUrl.searchParams.get('id')
    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!assignmentId || !projectId) {
      return NextResponse.json(
        { error: 'id and projectId required' },
        { status: 400 }
      )
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete assignment
    const { error } = await supabase
      .from('pm_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('project_id', projectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[API] Triager configure DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
