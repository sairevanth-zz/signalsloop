import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf-protection';
import { applySecurityHeaders } from '@/lib/security-headers';

/**
 * GET /api/csrf-token
 * Generate and return a CSRF token
 */
export async function GET(request: NextRequest) {
  try {
    const { token, cookie } = await generateCSRFToken(request);

    const response = NextResponse.json({
      success: true,
      csrfToken: token,
    });

    response.headers.set('Set-Cookie', cookie);
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Error generating CSRF token:', error);

    const response = NextResponse.json(
      {
        error: 'Failed to generate CSRF token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );

    return applySecurityHeaders(response);
  }
}
