import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const title = searchParams.get('title') || 'SignalLoop';
    const subtitle = searchParams.get('subtitle') || 'Simple feedback boards & public roadmaps';
    const votes = searchParams.get('votes');
    const status = searchParams.get('status');
    const type = searchParams.get('type') || 'default'; // 'post', 'board', 'roadmap', 'default'

    // Color schemes for different statuses
    const statusColors = {
      open: '#3B82F6', // blue
      planned: '#F59E0B', // yellow  
      in_progress: '#8B5CF6', // purple
      done: '#10B981', // green
      declined: '#6B7280' // gray
    };

    const bgColor = status ? statusColors[status as keyof typeof statusColors] || '#3B82F6' : '#3B82F6';

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
            backgroundColor: '#fff',
            backgroundImage: `linear-gradient(135deg, ${bgColor}22 0%, ${bgColor}11 100%)`,
            padding: '40px',
          }}
        >
          {/* Logo and Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '15px',
                background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}CC 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '20px',
              }}
            >
              <span style={{ fontSize: '28px', color: '#fff', fontWeight: 'bold' }}>SL</span>
            </div>
            <span
              style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1F2937',
              }}
            >
              SignalLoop
            </span>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            <h1
              style={{
                fontSize: title.length > 40 ? '48px' : '56px',
                fontWeight: '800',
                color: '#1F2937',
                marginBottom: '20px',
                lineHeight: '1.2',
              }}
            >
              {title}
            </h1>
            
            <p
              style={{
                fontSize: '24px',
                color: '#6B7280',
                marginBottom: '30px',
                lineHeight: '1.4',
              }}
            >
              {subtitle}
            </p>

            {/* Badges/Stats */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
              }}
            >
              {votes && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '25px',
                    padding: '12px 20px',
                  }}
                >
                  <span style={{ fontSize: '18px', marginRight: '8px' }}>👍</span>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937' }}>
                    {votes} votes
                  </span>
                </div>
              )}
              
              {status && (
                <div
                  style={{
                    backgroundColor: bgColor,
                    color: '#fff',
                    borderRadius: '25px',
                    padding: '12px 20px',
                    fontSize: '18px',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {status.replace('_', ' ')}
                </div>
              )}
              
              {type === 'board' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '25px',
                    padding: '12px 20px',
                  }}
                >
                  <span style={{ fontSize: '18px', marginRight: '8px' }}>💬</span>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937' }}>
                    Feedback Board
                  </span>
                </div>
              )}

              {type === 'roadmap' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '25px',
                    padding: '12px 20px',
                  }}
                >
                  <span style={{ fontSize: '18px', marginRight: '8px' }}>🗺️</span>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937' }}>
                    Public Roadmap
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              alignItems: 'center',
              color: '#9CA3AF',
              fontSize: '16px',
            }}
          >
            <span>🚀 Simple feedback boards & public roadmaps</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.log(`Failed to generate OG image: ${(e as Error).message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
