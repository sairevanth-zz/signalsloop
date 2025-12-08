import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Lazy getter for Supabase client to avoid build-time initialization
function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, apiKey, url, timestamp, ...properties } = body;

    // Validate required fields - return 200 with warning instead of 400 to avoid console errors
    if (!event || !apiKey) {
      console.warn('Analytics event missing required fields:', { event, apiKey });
      return NextResponse.json({
        success: false,
        warning: 'Event and API key are required'
      }, {
        status: 200, // Return 200 instead of 400 to avoid console errors
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Get client IP and user agent
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'direct';

    // Try to find the project associated with this API key
    let projectId = null;

    try {
      const { data: apiKeyData } = await getSupabase()
        .from('api_keys')
        .select('project_id')
        .eq('key_hash', btoa(apiKey))
        .single();

      if (apiKeyData) {
        projectId = apiKeyData.project_id;
      }
    } catch (error) {
      // API key not found, continue without project association
      console.log('API key not found for analytics:', apiKey);
    }

    // Store the analytics event in the database
    const { error: insertError } = await getSupabase()
      .from('analytics_events')
      .insert({
        event_name: event,
        api_key: apiKey,
        project_id: projectId,
        url: url || 'unknown',
        user_agent: userAgent,
        ip_address: clientIp,
        referer: referer,
        properties: properties || {},
        timestamp: timestamp || new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing analytics event:', insertError);
      // Don't fail the request if analytics storage fails
    }

    // Log the event for debugging
    console.log('Widget Analytics Event:', {
      event,
      apiKey,
      projectId,
      url,
      timestamp: timestamp || new Date().toISOString(),
      userAgent,
      referer,
      clientIp,
      ...properties
    });

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

// OPTIONS endpoint for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}