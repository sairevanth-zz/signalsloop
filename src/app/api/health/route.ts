import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Health check endpoint
 * Returns overall application health
 * 
 * Use /api/admin/health for detailed security checks (requires auth)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const detailed = url.searchParams.get('detailed') === 'true';
  
  try {
    // Basic health check
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
    
    if (detailed) {
      // Basic config checks (edge-compatible)
      const configChecks = {
        supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        csrf: !!process.env.CSRF_SECRET,
        openai: !!process.env.OPENAI_API_KEY,
      };
      
      return NextResponse.json({
        ...health,
        config: configChecks,
      });
    }
    
    // Simple health check
    return new Response('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed' 
      },
      { status: 503 }
    );
  }
}
