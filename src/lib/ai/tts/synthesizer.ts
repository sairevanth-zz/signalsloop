/**
 * Text-to-Speech Synthesizer
 * Core service for generating audio from text using OpenAI TTS API
 */

import { getOpenAI } from '@/lib/openai-client';
import { R2Client, getR2Client } from '@/lib/r2-client';
import type { Voice, TTSModel, AudioFormat, TTSOptions, TTSGenerationResult } from './types';
import { getDefaultVoice } from './types';


// Estimated words per minute for duration calculation
const WORDS_PER_MINUTE = 150;

/**
 * Estimate audio duration based on text length
 */
export function estimateDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const minutes = wordCount / WORDS_PER_MINUTE;
  return Math.ceil(minutes * 60); // Return seconds
}

/**
 * Generate a unique key for storing audio in R2
 */
function generateStorageKey(projectId: string, briefingId: string, voice: Voice): string {
  const date = new Date().toISOString().split('T')[0];
  return `audio-briefings/${projectId}/${date}/${briefingId}-${voice}.mp3`;
}

/**
 * Upload audio buffer to R2 storage
 */
async function uploadToStorage(
  buffer: Buffer,
  projectId: string,
  briefingId: string,
  voice: Voice
): Promise<{ url: string; key: string }> {
  const r2 = getR2Client();
  const key = generateStorageKey(projectId, briefingId, voice);
  
  await r2.upload(key, buffer, 'audio/mpeg');
  
  // Generate a presigned URL valid for 24 hours
  const url = await r2.getDownloadUrl(key, 24 * 60 * 60);
  
  return { url, key };
}

/**
 * Generate audio briefing from text
 */
export async function generateAudioBriefing(
  briefingText: string,
  projectId: string,
  briefingId: string,
  options: TTSOptions = {}
): Promise<TTSGenerationResult> {
  const voice = options.voice || getDefaultVoice();
  const model: TTSModel = options.model || 'tts-1-hd';
  const format: AudioFormat = options.format || 'mp3';
  const speed = options.speed || 1.0;

  // Validate speed
  const validSpeed = Math.max(0.25, Math.min(4.0, speed));

  // Prepare text for TTS (clean up any markdown or special characters)
  const cleanText = cleanTextForTTS(briefingText);

  // Generate audio using OpenAI TTS
  const mp3Response = await getOpenAI().audio.speech.create({
    model,
    voice,
    input: cleanText,
    response_format: format,
    speed: validSpeed,
  });

  // Convert response to buffer
  const buffer = Buffer.from(await mp3Response.arrayBuffer());
  const fileSize = buffer.length;

  // Upload to R2 storage
  const { url } = await uploadToStorage(buffer, projectId, briefingId, voice);

  // Estimate duration
  const duration = estimateDuration(cleanText);

  return {
    audioUrl: url,
    duration,
    fileSize,
    voice,
    cached: false,
  };
}

/**
 * Clean text for TTS processing
 * Removes markdown, URLs, and other elements that don't read well
 */
function cleanTextForTTS(text: string): string {
  let cleaned = text;

  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');

  // Remove markdown links but keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove markdown bold/italic
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

  // Remove markdown headers
  cleaned = cleaned.replace(/^#+\s+/gm, '');

  // Remove emojis (they can cause pronunciation issues)
  cleaned = cleaned.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ''
  );

  // Replace bullet points with natural pauses
  cleaned = cleaned.replace(/^[-•]\s+/gm, '. ');

  // Replace multiple spaces with single space
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Trim
  cleaned = cleaned.trim();

  // Add natural pauses for readability
  // Replace semicolons with periods for better pacing
  cleaned = cleaned.replace(/;/g, '.');

  return cleaned;
}

/**
 * Get audio briefing if it exists in cache
 */
export async function getCachedAudioBriefing(
  projectId: string,
  briefingId: string,
  voice: Voice
): Promise<TTSGenerationResult | null> {
  try {
    const r2 = getR2Client();
    const key = generateStorageKey(projectId, briefingId, voice);
    
    const exists = await r2.exists(key);
    if (!exists) {
      return null;
    }

    // Get presigned URL
    const url = await r2.getDownloadUrl(key, 24 * 60 * 60);

    return {
      audioUrl: url,
      duration: 0, // Duration unknown for cached files
      fileSize: 0, // Size unknown for cached files
      voice,
      cached: true,
    };
  } catch (error) {
    console.error('Error checking cached audio:', error);
    return null;
  }
}

/**
 * Delete cached audio briefing
 */
export async function deleteCachedAudioBriefing(
  projectId: string,
  briefingId: string,
  voice: Voice
): Promise<void> {
  try {
    const r2 = getR2Client();
    const key = generateStorageKey(projectId, briefingId, voice);
    await r2.delete(key);
  } catch (error) {
    console.error('Error deleting cached audio:', error);
  }
}

/**
 * Generate audio for a quick text snippet (not stored)
 * Useful for testing or short notifications
 */
export async function generateQuickAudio(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const voice = options.voice || getDefaultVoice();
  const model: TTSModel = options.model || 'tts-1';
  const format: AudioFormat = options.format || 'mp3';
  const speed = options.speed || 1.0;

  const cleanText = cleanTextForTTS(text);

  const response = await getOpenAI().audio.speech.create({
    model,
    voice,
    input: cleanText,
    response_format: format,
    speed,
  });

  return Buffer.from(await response.arrayBuffer());
}
