import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://signalloop.com';
  
  const robotsTxt = `User-agent: *
Allow: /
Allow: /pricing
Allow: /docs
Allow: /demo/board
Allow: /demo/roadmap
Allow: /demo/changelog

# Disallow admin and private pages
Disallow: /app/
Disallow: /admin/
Disallow: /api/
Disallow: /login
Disallow: /_next/
Disallow: /embed/

# Allow public boards and roadmaps
Allow: /*/board
Allow: /*/roadmap  
Allow: /*/changelog
Allow: /*/post/*

# Disallow test and debug pages
Disallow: /admin-test
Disallow: /auth-test
Disallow: /billing/
Disallow: /payment-test
Disallow: /test-
Disallow: /debug
Disallow: /env-test
Disallow: /js-test
Disallow: /simple-test
Disallow: /click-test
Disallow: /demo-no-deps
Disallow: /demo-simple
Disallow: /auth-debug
Disallow: /mobile-board-test
Disallow: /seo-demo

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay
Crawl-delay: 1`;

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  });
}
