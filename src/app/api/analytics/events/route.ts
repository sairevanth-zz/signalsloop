import { NextRequest, NextResponse } from 'next/server';

const POSTHOG_API_URL = 'https://app.posthog.com/api/projects';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '7d';
  const projectId = searchParams.get('projectId');

  if (!process.env.POSTHOG_PERSONAL_API_KEY) {
    // Return mock data if no PostHog API key
    return NextResponse.json(generateMockAnalytics(timeRange));
  }

  try {
    const projectKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const headers = {
      'Authorization': `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
      'Content-Type': 'application/json'
    };

    // Get insights data from PostHog
    const insights = await Promise.all([
      // Page views
      fetch(`${POSTHOG_API_URL}/${projectKey}/insights/trend/?events=[{"id": "$pageview"}]&date_from=-${timeRange}`, { headers }),
      
      // Custom events
      fetch(`${POSTHOG_API_URL}/${projectKey}/insights/trend/?events=[{"id": "submit_post"}]&date_from=-${timeRange}`, { headers }),
      
      fetch(`${POSTHOG_API_URL}/${projectKey}/insights/trend/?events=[{"id": "vote"}]&date_from=-${timeRange}`, { headers }),
      
      // Conversions
      fetch(`${POSTHOG_API_URL}/${projectKey}/insights/trend/?events=[{"id": "purchase"}]&date_from=-${timeRange}`, { headers }),
    ]);

    const [pageViews, posts, votes, conversions] = await Promise.all(
      insights.map(r => r.json())
    );

    // Process and return the data
    const analytics = {
      pageViews: processPostHogData(pageViews),
      posts: processPostHogData(posts),
      votes: processPostHogData(votes),
      conversions: processPostHogData(conversions),
      summary: {
        totalPageViews: pageViews.result?.[0]?.aggregated_value || 0,
        totalPosts: posts.result?.[0]?.aggregated_value || 0,
        totalVotes: votes.result?.[0]?.aggregated_value || 0,
        totalConversions: conversions.result?.[0]?.aggregated_value || 0
      }
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching PostHog analytics:', error);
    // Fallback to mock data on error
    return NextResponse.json(generateMockAnalytics(timeRange));
  }
}

function processPostHogData(data: any) {
  if (!data.result?.[0]?.data) return [];
  
  return data.result[0].data.map((point: any) => ({
    date: point[0],
    value: point[1],
    label: new Date(point[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));
}

function generateMockAnalytics(timeRange: string) {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  
  const generateTimeSeries = (baseValue: number, variance: number) => {
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * variance + baseValue),
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    return data;
  };

  return {
    pageViews: generateTimeSeries(200, 100),
    posts: generateTimeSeries(5, 10),
    votes: generateTimeSeries(20, 30),
    conversions: generateTimeSeries(1, 2),
    summary: {
      totalPageViews: 2847,
      totalPosts: 45,
      totalVotes: 312,
      totalConversions: 7
    }
  };
}
