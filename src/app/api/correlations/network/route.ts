import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { correlationEngine } from '@/lib/correlation/correlation-engine'

/**
 * GET /api/correlations/network
 * Get correlation network for visualization
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

    // Get correlation network
    const network = await correlationEngine.getCorrelationNetwork(projectId)

    return NextResponse.json({ network })

  } catch (error: any) {
    console.error('[API] Correlations network error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
