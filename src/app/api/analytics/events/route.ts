import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, apiKey, url, timestamp, ...properties } = body;

    // Validate required fields
    if (!event || !apiKey) {
      return NextResponse.json({ error: 'Event and API key are required' }, { status: 400 });
    }

    // Log the event (in production, you'd send this to your analytics service)
    console.log('Widget Analytics Event:', {
      event,
      apiKey,
      url,
      timestamp: timestamp || new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      ...properties
    });

    // Here you would typically send to PostHog, Mixpanel, or your analytics service
    // For now, we'll just acknowledge receipt
    
    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}