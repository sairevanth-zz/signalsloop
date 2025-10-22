import { NextResponse } from 'next/server';

export async function withTimeout(
  handler: () => Promise<NextResponse>,
  timeoutMs: number = 30000
): Promise<NextResponse> {
  return Promise.race([
    handler(),
    new Promise<NextResponse>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]).catch((error) => {
    if (error.message === 'Request timeout') {
      return NextResponse.json(
        { error: 'Request timeout', message: 'The request took too long to process' },
        { status: 504 }
      );
    }
    throw error;
  });
}
