import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client'
import { correlationEngine } from '@/lib/correlation/correlation-engine'

/**
 * POST /api/correlations/detect
 * Manually trigger correlation detection
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await req.json()

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

    // Run correlation detection
    await correlationEngine.detectAllCorrelations(projectId)

    // Get updated network
    const network = await correlationEngine.getCorrelationNetwork(projectId)

    return NextResponse.json({
      success: true,
      network
    })

  } catch (error: any) {
    console.error('[API] Correlations detect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
