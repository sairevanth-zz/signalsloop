/**
 * API Route: Transcribe Audio
 * POST /api/ask/transcribe
 *
 * Transcribes audio files using OpenAI Whisper API
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@/lib/supabase-client';
import type { TranscribeResponse } from '@/types/ask';

// ============================================================================
// Configuration
// ============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Max file size: 25MB (Whisper API limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Supported audio formats
const SUPPORTED_FORMATS = [
  'audio/mpeg', // mp3
  'audio/mp4', // m4a
  'audio/wav',
  'audio/webm',
  'audio/ogg',
];

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    console.log('[Transcribe] Request received');

    // 1. Check OpenAI API key
    if (!openai) {
      console.error('[Transcribe] OpenAI API key not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI API key is not configured',
        } as TranscribeResponse,
        { status: 500 }
      );
    }

    // 2. Authenticate user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Transcribe] Authentication failed:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        } as TranscribeResponse,
        { status: 401 }
      );
    }

    console.log('[Transcribe] User authenticated:', user.id);

    // 3. Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = formData.get('language') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'No audio file provided',
        } as TranscribeResponse,
        { status: 400 }
      );
    }

    // 4. Validate file
    console.log('[Transcribe] File received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });

    // Check file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds maximum of 25MB. Your file is ${(audioFile.size / (1024 * 1024)).toFixed(2)}MB`,
        } as TranscribeResponse,
        { status: 400 }
      );
    }

    // Check file type
    if (!SUPPORTED_FORMATS.includes(audioFile.type)) {
      console.warn('[Transcribe] Unsupported file type:', audioFile.type);
      // Don't reject - Whisper might still handle it
    }

    // 5. Convert File to buffer for OpenAI
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File-like object that OpenAI expects
    const fileForOpenAI = new File([buffer], audioFile.name || 'recording.webm', {
      type: audioFile.type || 'audio/webm',
    });

    // 6. Call Whisper API
    console.log('[Transcribe] Calling Whisper API');
    const startTime = Date.now();

    const transcription = await openai.audio.transcriptions.create({
      file: fileForOpenAI,
      model: 'whisper-1',
      response_format: 'verbose_json', // Get duration and language
      language: language || undefined, // Optional language hint
    });

    const latency = Date.now() - startTime;
    console.log('[Transcribe] Transcription completed in', latency, 'ms');
    console.log('[Transcribe] Result:', {
      textLength: transcription.text.length,
      duration: transcription.duration,
      language: transcription.language,
    });

    // 7. Return transcription result
    return NextResponse.json({
      success: true,
      transcription: {
        text: transcription.text,
        duration: transcription.duration || 0,
        language: transcription.language,
      },
    } as TranscribeResponse);
  } catch (error) {
    console.error('[Transcribe] Error:', error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      console.error('[Transcribe] OpenAI API error:', {
        status: error.status,
        message: error.message,
        type: error.type,
      });

      let errorMessage = 'Failed to transcribe audio';

      if (error.status === 400) {
        errorMessage = 'Invalid audio file format';
      } else if (error.status === 413) {
        errorMessage = 'Audio file too large';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment';
      } else if (error.status === 500) {
        errorMessage = 'OpenAI service error. Please try again';
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        } as TranscribeResponse,
        { status: error.status }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to transcribe audio',
      } as TranscribeResponse,
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS Handler (for CORS)
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
