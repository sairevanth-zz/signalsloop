/**
 * Call Audit Export API
 * GET /api/calls/export?projectId=xxx&format=pdf|md
 *
 * Exports call analysis summary as PDF or Markdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const format = searchParams.get('format') || 'md';

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (format !== 'pdf' && format !== 'md') {
      return NextResponse.json(
        { error: 'format must be pdf or md' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch summary data
    const summaryResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/calls/summary?projectId=${projectId}`,
      { headers: request.headers }
    );

    if (!summaryResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch summary data' },
        { status: 500 }
      );
    }

    const { summary } = await summaryResponse.json();

    // Fetch call records
    const { data: callRecords } = await supabase
      .from('call_records')
      .select('*')
      .eq('project_id', projectId)
      .not('analyzed_at', 'is', null)
      .order('priority_score', { ascending: false })
      .limit(20);

    // Generate markdown content
    const markdown = generateMarkdownReport(project, summary, callRecords || []);

    if (format === 'md') {
      // Return as Markdown file
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="call-audit-${project.slug}-${new Date().toISOString().split('T')[0]}.md"`,
        },
      });
    }

    // For PDF, return markdown for now (client-side can convert)
    // In production, you'd use a library like puppeteer or jsPDF
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="call-audit-${project.slug}-${new Date().toISOString().split('T')[0]}.md"`,
      },
    });
  } catch (error) {
    console.error('[Call Export] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateMarkdownReport(
  project: any,
  summary: any,
  callRecords: any[]
): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `# Call Audit Report: ${project.name}

**Generated:** ${date}
**Total Calls Analyzed:** ${summary.analyzed_calls} of ${summary.total_calls}

---

## Executive Summary

${summary.top_insights.map((insight: string, i: number) => `${i + 1}. ${insight}`).join('\n')}

---

## Key Metrics

### Revenue Impact

- **Expansion Opportunity:** $${summary.expansion_revenue.toLocaleString()}
- **Churn Risk:** $${summary.churn_risk_revenue.toLocaleString()}
- **Average Sentiment:** ${getSentimentLabel(summary.avg_sentiment)} (${(summary.avg_sentiment * 100).toFixed(0)}%)

### Top Objections

${summary.top_objections.length > 0
    ? summary.top_objections.map((obj: any, i: number) =>
        `${i + 1}. **${obj.type}** - ${obj.count} mentions ${obj.severity ? `(${obj.severity} severity)` : ''}`
      ).join('\n')
    : '_No objections detected_'
}

### Competitor Mentions

${summary.top_competitors.length > 0
    ? summary.top_competitors.map((comp: any, i: number) =>
        `${i + 1}. **${comp.name}** - ${comp.mentions} mentions`
      ).join('\n')
    : '_No competitors mentioned_'
}

---

## Feature Requests

${summary.feature_frequency.length > 0
    ? summary.feature_frequency.slice(0, 10).map((feature: any, i: number) =>
        `${i + 1}. **${feature.title}** - ${feature.count} requests${feature.total_arr ? ` ($${feature.total_arr.toLocaleString()} ARR)` : ''}`
      ).join('\n')
    : '_No feature requests detected_'
}

---

## Call Highlights

${callRecords.length > 0
    ? callRecords.slice(0, 10).map((call: any, i: number) => `
### ${i + 1}. ${call.customer || 'Unknown Customer'}

**Deal:** ${call.deal_id || 'N/A'} | **Amount:** ${call.amount ? `$${call.amount.toLocaleString()}` : 'N/A'} | **Stage:** ${call.stage || 'N/A'}
**Sentiment:** ${getSentimentLabel(call.sentiment)} | **Priority:** ${call.priority_score || 'N/A'}/100

${call.highlight_summary || '_No summary available_'}

${call.competitors?.length > 0 ? `**Competitors Mentioned:** ${call.competitors.map((c: any) => c.name || c.competitor).join(', ')}` : ''}
`).join('\n---\n')
    : '_No calls analyzed yet_'
}

---

## Recommendations

Based on the analysis of ${summary.analyzed_calls} customer calls:

1. **Address Top Objections:** ${summary.top_objections.length > 0 ? `Focus on resolving "${summary.top_objections[0].type}" concerns, which appeared in ${summary.top_objections[0].count} calls.` : 'No major objections detected.'}

2. **Prioritize Feature Requests:** ${summary.feature_frequency.length > 0 ? `"${summary.feature_frequency[0].title}" was requested ${summary.feature_frequency[0].count} times and should be prioritized.` : 'Monitor for emerging patterns.'}

3. **Competitive Positioning:** ${summary.top_competitors.length > 0 ? `${summary.top_competitors[0].name} is the most mentioned competitor (${summary.top_competitors[0].mentions} mentions). Review positioning against them.` : 'No significant competitive mentions.'}

4. **Revenue Opportunities:** ${summary.expansion_revenue > 0 ? `$${summary.expansion_revenue.toLocaleString()} in expansion opportunities identified. Follow up on positive expansion signals.` : 'Monitor for expansion opportunities.'}

5. **Churn Prevention:** ${summary.churn_risk_revenue > 0 ? `$${summary.churn_risk_revenue.toLocaleString()} at risk. Immediate action needed on accounts with negative sentiment.` : 'No immediate churn risks detected.'}

---

*Report generated by SignalsLoop Call Intelligence Engine*
`;
}

function getSentimentLabel(sentiment: number | null): string {
  if (sentiment === null) return 'Unknown';
  if (sentiment > 0.3) return 'Positive';
  if (sentiment < -0.3) return 'Negative';
  return 'Neutral';
}
