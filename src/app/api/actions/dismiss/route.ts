import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client'
import { dismissAction } from '@/lib/actions/action-queue'

/**
 * POST /api/actions/dismiss
 * Dismiss a specific action
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { actionId, reason } = await req.json()

    if (!actionId) {
      return NextResponse.json({ error: 'actionId required' }, { status: 400 })
    }

    // Verify action belongs to user's project
    const { data: action } = await supabase
      .from('unified_action_queue')
      .select('project_id, projects!inner(user_id)')
      .eq('id', actionId)
      .single()

    if (!action || action.projects.user_id !== user.id) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    // Dismiss action
    await dismissAction(actionId, user.id, reason)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[API] Actions dismiss error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
