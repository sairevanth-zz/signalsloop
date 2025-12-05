/**
 * API Route: Audio Briefing Generation
 * POST /api/dashboard/briefing/audio
 *
 * Generates an audio version of the daily briefing using OpenAI TTS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { generateAudioBriefing, getCachedAudioBriefing } from '@/lib/ai/tts/synthesizer';
import { saveAudioBriefing, getCachedAudio, getVoicePreference } from '@/lib/ai/tts/audio-cache';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';
import type { Voice } from '@/lib/ai/tts/types';
import type { DailyBriefingContent } from '@/lib/ai/mission-control';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { projectId, briefingId, voice: requestedVoice, forceRegenerate } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
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
      .select('id, name, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get voice preference (user's preference or requested voice)
    const voice: Voice = requestedVoice || await getVoicePreference(project.owner_id) || 'nova';

    // Get the briefing content
    let targetBriefingId = briefingId;
    let briefingText: string;

    if (briefingId) {
      // Get specific briefing
      const { data: briefing, error: briefingError } = await supabase
        .from('daily_briefings')
        .select('id, content')
        .eq('id', briefingId)
        .eq('project_id', projectId)
        .single();

      if (briefingError || !briefing) {
        return NextResponse.json(
          { error: 'Briefing not found' },
          { status: 404 }
        );
      }

      const content = briefing.content as DailyBriefingContent;
      briefingText = formatBriefingForTTS(content);
      targetBriefingId = briefing.id;
    } else {
      // Get today's briefing
      const { data: todayBriefing } = await supabase
        .rpc('get_today_briefing', { p_project_id: projectId });

      if (!todayBriefing || todayBriefing.length === 0) {
        return NextResponse.json(
          { error: 'No briefing available for today. Please generate a briefing first.' },
          { status: 404 }
        );
      }

      const content = todayBriefing[0].content as DailyBriefingContent;
      briefingText = formatBriefingForTTS(content);
      targetBriefingId = todayBriefing[0].id;
    }

    // Check for cached audio (unless force regenerate)
    if (!forceRegenerate) {
      const cached = await getCachedAudio(targetBriefingId, voice);
      if (cached) {
        return NextResponse.json({
          success: true,
          audioUrl: cached.audioUrl,
          duration: cached.duration,
          voice: cached.voice,
          cached: true,
        });
      }
    }

    // Check AI usage limits
    const usageCheck = await checkAIUsageLimit(projectId, 'tts_generation');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'TTS usage limit reached',
          limit: usageCheck.limit,
          current: usageCheck.current,
          isPro: usageCheck.isPro,
        },
        { status: 429 }
      );
    }

    // Generate audio
    const result = await generateAudioBriefing(
      briefingText,
      projectId,
      targetBriefingId,
      { voice }
    );

    // Save to cache
    await saveAudioBriefing(projectId, targetBriefingId, result);

    // Increment AI usage
    await incrementAIUsage(projectId, 'tts_generation');

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      fileSize: result.fileSize,
      voice: result.voice,
      cached: false,
    });
  } catch (error) {
    console.error('Error generating audio briefing:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate audio briefing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if audio exists for a briefing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const briefingId = searchParams.get('briefingId');
    const voice = searchParams.get('voice') as Voice || 'nova';

    if (!briefingId) {
      return NextResponse.json(
        { error: 'briefingId is required' },
        { status: 400 }
      );
    }

    const cached = await getCachedAudio(briefingId, voice);

    if (cached) {
      return NextResponse.json({
        exists: true,
        audioUrl: cached.audioUrl,
        duration: cached.duration,
        voice: cached.voice,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('Error checking audio:', error);
    return NextResponse.json(
      { error: 'Failed to check audio status' },
      { status: 500 }
    );
  }
}

/**
 * Format briefing content for TTS
 * Creates a natural-sounding narrative from structured data
 */
function formatBriefingForTTS(content: DailyBriefingContent): string {
  const parts: string[] = [];

  // Opening
  parts.push("Here's your daily intelligence briefing.");

  // Main summary
  if (content.briefing_text) {
    parts.push(content.briefing_text);
  }

  // Critical items
  if (content.critical_items && content.critical_items.length > 0) {
    parts.push(`You have ${content.critical_items.length} critical ${content.critical_items.length === 1 ? 'item' : 'items'} requiring immediate attention.`);
    content.critical_items.forEach((item, index) => {
      parts.push(`Critical item ${index + 1}: ${item.title}. ${item.description}`);
    });
  }

  // Warning items
  if (content.warning_items && content.warning_items.length > 0) {
    parts.push(`There are ${content.warning_items.length} ${content.warning_items.length === 1 ? 'item' : 'items'} that need your attention.`);
    content.warning_items.slice(0, 3).forEach((item) => {
      parts.push(`${item.title}.`);
    });
  }

  // Good news
  if (content.success_items && content.success_items.length > 0) {
    parts.push("Some good news:");
    content.success_items.forEach((item) => {
      parts.push(item.title);
    });
  }

  // Opportunities
  if (content.opportunities && content.opportunities.length > 0) {
    parts.push(`You have ${content.opportunities.length} opportunities to explore.`);
    content.opportunities.slice(0, 2).forEach((opp) => {
      parts.push(`${opp.title} with ${opp.impact} impact potential.`);
    });
  }

  // Closing
  parts.push("That's all for your briefing. Have a productive day.");

  return parts.join(' ');
}
