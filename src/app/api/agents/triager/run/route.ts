import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client'
import { triageAgent } from '@/lib/agents/triager-agent'

/**
 * POST /api/agents/triager/run
 * Manually trigger triage for a specific feedback item
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId, projectId } = await req.json()

    if (!postId || !projectId) {
      return NextResponse.json(
        { error: 'postId and projectId required' },
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

    // Run triager
    const result = await triageAgent(postId, projectId)

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error: any) {
    console.error('[API] Triager run error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
