import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  return NextResponse.json({
    message: 'Callback test endpoint working',
    url: request.url,
    searchParams: Object.fromEntries(searchParams.entries()),
    headers: Object.fromEntries(request.headers.entries())
  });
}
