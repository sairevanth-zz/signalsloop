import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://signalloop.com';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/app/admin',
        '/app/analytics',
        '/app/settings',
        '/api/',
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
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
