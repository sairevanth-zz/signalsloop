import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SignalsLoop - AI Feedback Management Platform';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: 'white',
          padding: '80px',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            marginBottom: 24,
            textAlign: 'center',
            letterSpacing: '-0.025em',
          }}
        >
          SignalsLoop
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 'normal',
            textAlign: 'center',
            opacity: 0.95,
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          AI-Powered Feedback Management Platform
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 'normal',
            textAlign: 'center',
            opacity: 0.9,
            marginTop: 32,
          }}
        >
          Auto-categorize • Prioritize • Smart Replies
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 'normal',
            textAlign: 'center',
            opacity: 0.8,
            marginTop: 48,
          }}
        >
          From $19/mo • 80% cheaper than competitors
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
