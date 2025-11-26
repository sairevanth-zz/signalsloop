import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

const openaiApiKey = process.env.OPENAI_API_KEY;
const MODEL = process.env.ASK_AI_MODEL || 'gpt-4o-mini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, question } = body || {};

    if (!token || !question) {
      return NextResponse.json({ success: false, error: 'token and question are required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id, project_id, token_expires_at')
      .eq('access_token', token)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 404 });
    }

    if (stakeholder.token_expires_at && new Date(stakeholder.token_expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'Token expired' }, { status: 403 });
    }

    const { data: roadmap } = await supabase
      .from('roadmap_suggestions')
      .select('priority_level, priority_score, recommendation_text, status')
      .eq('project_id', stakeholder.project_id)
      .order('priority_score', { ascending: false })
      .limit(5);

    const roadmapSummary = (roadmap || [])
      .map((r) => `${r.priority_level?.toUpperCase()}: ${r.recommendation_text || 'No summary'}`)
      .join('\n');

    let answer = '';

    if (openaiApiKey) {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const prompt = `You are a product status assistant for stakeholders. Answer clearly and briefly.\n\nRoadmap Highlights:\n${roadmapSummary || 'No roadmap suggestions yet.'}\n\nStakeholder question: ${question}`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Be concise (<=120 words), actionable, and avoid technical jargon.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 200,
      });

      answer = completion.choices[0].message?.content || 'No answer.';
    } else {
      answer = `Roadmap summary: ${roadmapSummary || 'No items available.'}\n\nQuestion: ${question}\n\nAction: We will follow up with more details.`;
    }

    return NextResponse.json({ success: true, answer });
  } catch (error) {
    console.error('[Stakeholder Ask] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to answer question' }, { status: 500 });
  }
}
