import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client'

/**
 * GET /api/agents/triager/queue
 * Get triage queue for a project
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = req.nextUrl.searchParams.get('projectId')
    const status = req.nextUrl.searchParams.get('status') || 'pending'

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

    // Fetch queue items
    const { data: queue, error } = await supabase
      .from('triage_queue')
      .select(`
        *,
        posts (
          id,
          title,
          description,
          category,
          priority,
          vote_count,
          comment_count,
          status,
          created_at
        )
      `)
      .eq('project_id', projectId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get stats
    const { data: stats } = await getSupabaseServiceRoleClient()
      .rpc('get_triage_stats', { p_project_id: projectId })

    return NextResponse.json({
      queue: queue || [],
      stats: stats || {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0
      }
    })

  } catch (error: any) {
    console.error('[API] Triager queue GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
