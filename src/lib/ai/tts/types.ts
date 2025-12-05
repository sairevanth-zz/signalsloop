/**
 * Text-to-Speech Types
 * Types for OpenAI TTS integration
 */

export type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export type TTSModel = 'tts-1' | 'tts-1-hd';

export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac';

export interface TTSOptions {
  voice?: Voice;
  model?: TTSModel;
  format?: AudioFormat;
  speed?: number; // 0.25 to 4.0
}

export interface AudioBriefing {
  id: string;
  projectId: string;
  briefingId: string;
  audioUrl: string;
  voice: Voice;
  duration: number; // in seconds
  fileSize: number; // in bytes
  createdAt: Date;
  expiresAt: Date;
}

export interface TTSGenerationResult {
  audioUrl: string;
  duration: number;
  fileSize: number;
  voice: Voice;
  cached: boolean;
}

export interface VoiceOption {
  id: Voice;
  name: string;
  description: string;
  accent: string;
  gender: 'male' | 'female' | 'neutral';
  style: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'nova',
    name: 'Nova',
    description: 'Friendly and warm',
    accent: 'American',
    gender: 'female',
    style: 'conversational',
  },
  {
    id: 'alloy',
    name: 'Alloy',
    description: 'Balanced and neutral',
    accent: 'American',
    gender: 'neutral',
    style: 'professional',
  },
  {
    id: 'echo',
    name: 'Echo',
    description: 'Deep and authoritative',
    accent: 'American',
    gender: 'male',
    style: 'formal',
  },
  {
    id: 'fable',
    name: 'Fable',
    description: 'Expressive and dynamic',
    accent: 'British',
    gender: 'neutral',
    style: 'storytelling',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    description: 'Deep and resonant',
    accent: 'American',
    gender: 'male',
    style: 'professional',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'Clear and bright',
    accent: 'American',
    gender: 'female',
    style: 'energetic',
  },
];

export function getVoiceById(id: Voice): VoiceOption | undefined {
  return VOICE_OPTIONS.find((v) => v.id === id);
}

export function getDefaultVoice(): Voice {
  return 'nova';
}
