import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://signalsloop.com';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/features',
          '/docs',
          '/support',
          '/terms',
          '/privacy',
          '/demo/board',
          '/demo/roadmap',
          '/demo/changelog',
          '/*/board',
          '/*/roadmap',
          '/*/changelog',
          '/*/post/*'
        ],
        disallow: [
          '/app/',
          '/admin/',
          '/api/',
          '/login',
          '/_next/',
          '/embed/',
          '/admin-test',
          '/auth-test',
          '/billing/',
          '/payment-test',
          '/test-',
          '/debug',
          '/env-test',
          '/js-test',
          '/simple-test',
          '/click-test',
          '/demo-no-deps',
          '/demo-simple',
          '/auth-debug',
          '/mobile-board-test'
        ],
        crawlDelay: 1,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
