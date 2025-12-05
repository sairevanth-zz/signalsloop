/**
 * Audio Briefing Cache Manager
 * Handles caching of generated audio briefings in database
 */

import { getSupabaseServerClient } from '@/lib/supabase-client';
import type { Voice, AudioBriefing, TTSGenerationResult } from './types';

export interface CachedAudioRecord {
  id: string;
  project_id: string;
  briefing_id: string;
  audio_url: string;
  voice: Voice;
  duration_seconds: number;
  file_size_bytes: number;
  created_at: string;
  expires_at: string;
}

/**
 * Save audio briefing metadata to database
 */
export async function saveAudioBriefing(
  projectId: string,
  briefingId: string,
  result: TTSGenerationResult
): Promise<AudioBriefing | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error('Database connection not available');
    return null;
  }

  // Set expiration to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('audio_briefings')
    .upsert(
      {
        project_id: projectId,
        briefing_id: briefingId,
        audio_url: result.audioUrl,
        voice: result.voice,
        duration_seconds: result.duration,
        file_size_bytes: result.fileSize,
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: 'briefing_id,voice',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error saving audio briefing:', error);
    return null;
  }

  return mapToAudioBriefing(data);
}

/**
 * Get cached audio briefing from database
 */
export async function getCachedAudio(
  briefingId: string,
  voice: Voice
): Promise<AudioBriefing | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('audio_briefings')
    .select('*')
    .eq('briefing_id', briefingId)
    .eq('voice', voice)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return mapToAudioBriefing(data);
}

/**
 * Get all cached audio for a project
 */
export async function getProjectAudioBriefings(
  projectId: string,
  limit: number = 10
): Promise<AudioBriefing[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('audio_briefings')
    .select('*')
    .eq('project_id', projectId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(mapToAudioBriefing);
}

/**
 * Delete expired audio briefings
 */
export async function cleanupExpiredAudio(): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return 0;
  }

  const { data, error } = await supabase
    .from('audio_briefings')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning up expired audio:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Delete specific audio briefing
 */
export async function deleteAudioBriefing(
  briefingId: string,
  voice?: Voice
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  let query = supabase
    .from('audio_briefings')
    .delete()
    .eq('briefing_id', briefingId);

  if (voice) {
    query = query.eq('voice', voice);
  }

  const { error } = await query;

  if (error) {
    console.error('Error deleting audio briefing:', error);
    return false;
  }

  return true;
}

/**
 * Update user's voice preference
 */
export async function updateVoicePreference(
  userId: string,
  voice: Voice
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        tts_voice: voice,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

  if (error) {
    console.error('Error updating voice preference:', error);
    return false;
  }

  return true;
}

/**
 * Get user's voice preference
 */
export async function getVoicePreference(userId: string): Promise<Voice> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return 'nova';
  }

  const { data } = await supabase
    .from('user_preferences')
    .select('tts_voice')
    .eq('user_id', userId)
    .single();

  return (data?.tts_voice as Voice) || 'nova';
}

/**
 * Map database record to AudioBriefing type
 */
function mapToAudioBriefing(record: CachedAudioRecord): AudioBriefing {
  return {
    id: record.id,
    projectId: record.project_id,
    briefingId: record.briefing_id,
    audioUrl: record.audio_url,
    voice: record.voice,
    duration: record.duration_seconds,
    fileSize: record.file_size_bytes,
    createdAt: new Date(record.created_at),
    expiresAt: new Date(record.expires_at),
  };
}
