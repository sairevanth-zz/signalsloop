/**
 * Lazy OpenAI Client
 * 
 * This helper provides a lazy-loaded OpenAI client instance that doesn't 
 * initialize until it's actually used, avoiding build-time errors when
 * OPENAI_API_KEY isn't available during static analysis.
 */

import OpenAI from 'openai';

let _openaiInstance: OpenAI | null = null;

/**
 * Get a lazily-initialized OpenAI client instance.
 * The client is only created when first called, not at module load time.
 */
export function getOpenAI(): OpenAI {
    if (!_openaiInstance) {
        _openaiInstance = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return _openaiInstance;
}

/**
 * For files that need to be updated but you want minimal changes,
 * you can import this as 'openai' and it will work as a drop-in replacement.
 * However, note that direct property access won't work - you'll need to call methods.
 */
export const lazyOpenAI = {
    chat: {
        completions: {
            create: (
                ...args: Parameters<OpenAI['chat']['completions']['create']>
            ) => getOpenAI().chat.completions.create(...args),
        },
    },
    audio: {
        transcriptions: {
            create: (
                ...args: Parameters<OpenAI['audio']['transcriptions']['create']>
            ) => getOpenAI().audio.transcriptions.create(...args),
        },
        speech: {
            create: (...args: Parameters<OpenAI['audio']['speech']['create']>) =>
                getOpenAI().audio.speech.create(...args),
        },
    },
    embeddings: {
        create: (...args: Parameters<OpenAI['embeddings']['create']>) =>
            getOpenAI().embeddings.create(...args),
    },
} as const;
