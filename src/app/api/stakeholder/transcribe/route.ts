import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60; // Vercel Pro tier - 60s for audio transcription

/**
 * Voice transcription endpoint using OpenAI Whisper API
 *
 * Accepts audio file and returns transcribed text
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    // Convert File to format Whisper expects
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type });

    // Create a File object that OpenAI SDK expects
    const file = new File([audioBlob], audioFile.name, { type: audioFile.type });

    // Transcribe audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // Optional: specify language for better accuracy
      response_format: 'json',
    });

    return NextResponse.json({
      text: transcription.text,
      success: true,
    });
  } catch (error: any) {
    console.error('[Transcribe API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to transcribe audio',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
