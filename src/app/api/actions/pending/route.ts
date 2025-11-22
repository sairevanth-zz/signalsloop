import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getPendingActions, getActionQueueStats } from '@/lib/actions/action-queue'

/**
 * GET /api/actions/pending
 * Get pending actions for a project
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
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

    // Get pending actions
    const actions = await getPendingActions(projectId)

    // Get stats
    const stats = await getActionQueueStats(projectId)

    return NextResponse.json({
      actions,
      stats
    })

  } catch (error: any) {
    console.error('[API] Actions pending GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
