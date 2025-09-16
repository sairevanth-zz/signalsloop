import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const title = searchParams.get('title') || 'SignalLoop';
    const subtitle = searchParams.get('subtitle') || 'Simple Feedback Boards & Public Roadmaps';
    const votes = searchParams.get('votes');
    const status = searchParams.get('status');

    // Status colors mapping
    const statusColors = {
      open: '#3B82F6',
      planned: '#F59E0B', 
      in_progress: '#8B5CF6',
      done: '#10B981',
      declined: '#6B7280'
    };

    const statusLabels = {
      open: 'Open',
      planned: 'Planned',
      in_progress: 'In Progress',
      done: 'Done',
      declined: 'Declined'
    };

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(45deg, #f8fafc 0%, #e2e8f0 100%)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#1e293b',
                marginRight: '20px',
              }}
            >
              📢
            </div>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              SignalLoop
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: '900px',
              padding: '0 40px',
            }}
          >
            {/* Title */}
            <div
              style={{
                fontSize: title.length > 50 ? '36px' : '48px',
                fontWeight: 'bold',
                color: '#1e293b',
                textAlign: 'center',
                lineHeight: '1.2',
                marginBottom: '20px',
              }}
            >
              {title}
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: '24px',
                color: '#64748b',
                textAlign: 'center',
                lineHeight: '1.4',
                marginBottom: '30px',
              }}
            >
              {subtitle}
            </div>

            {/* Status and Votes */}
            {(status || votes) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                }}
              >
                {status && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: statusColors[status as keyof typeof statusColors] || '#6B7280',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '18px',
                      fontWeight: '600',
                    }}
                  >
                    {statusLabels[status as keyof typeof statusLabels] || status}
                  </div>
                )}
                
                {votes && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '18px',
                      fontWeight: '600',
                    }}
                  >
                    👍 {votes} votes
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              alignItems: 'center',
              color: '#94a3b8',
              fontSize: '20px',
            }}
          >
            <div style={{ marginRight: '8px' }}>🤖</div>
            AI-Powered Feedback Boards & Smart Roadmaps
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.log(`${(e as Error).message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
