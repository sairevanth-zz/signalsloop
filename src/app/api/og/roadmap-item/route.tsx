import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Roadmap Item';
    const status = searchParams.get('status') || 'planned';
    const priority = searchParams.get('priority') || 'medium';

    const statusColors = {
      planned: '#F59E0B',
      in_progress: '#3B82F6',
      completed: '#10B981',
      open: '#6B7280'
    };

    const priorityColors = {
      low: '#6B7280',
      medium: '#3B82F6',
      high: '#F59E0B',
      critical: '#EF4444'
    };

    const statusLabels = {
      planned: 'PLANNED',
      in_progress: 'IN PROGRESS',
      completed: 'COMPLETED',
      open: 'UNDER REVIEW'
    };

    const priorityLabels = {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      critical: 'CRITICAL'
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
            backgroundColor: '#F9FAFB',
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
            }}
          />
          
          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '900px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Status and Priority Badges */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  backgroundColor: statusColors[status as keyof typeof statusColors],
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                }}
              >
                {statusLabels[status as keyof typeof statusLabels]}
              </div>
              <div
                style={{
                  backgroundColor: priorityColors[priority as keyof typeof priorityColors],
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                }}
              >
                {priorityLabels[priority as keyof typeof priorityLabels]} PRIORITY
              </div>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: title.length > 60 ? '48px' : title.length > 40 ? '52px' : '56px',
                fontWeight: 'bold',
                color: '#1F2937',
                lineHeight: 1.2,
                margin: 0,
                marginBottom: '24px',
                maxWidth: '800px',
                wordWrap: 'break-word',
              }}
            >
              {title}
            </h1>

            {/* SignalsLoop Branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '32px',
                padding: '16px 24px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#3B82F6',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: 'white',
                    borderRadius: '2px',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#3B82F6',
                }}
              >
                SignalsLoop Roadmap
              </span>
            </div>
          </div>

          {/* Bottom Gradient */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '100px',
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent)',
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
