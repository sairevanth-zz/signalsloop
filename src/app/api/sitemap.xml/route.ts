import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with error handling
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://signalloop.com';
  
  try {
    // Get public projects for dynamic URLs
    const supabase = getSupabaseClient();
    let projects = null;
    
    if (supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('slug, created_at')
        .eq('plan', 'free') // Only include public projects for now
        .limit(100);
        
      if (error) {
        console.error('Error fetching projects for sitemap:', error);
      } else {
        projects = data;
      }
    }

    // Static pages
    const staticPages: Array<{ url: string; priority: string; changefreq: string; lastmod?: string }> = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: '/pricing', priority: '0.9', changefreq: 'weekly' },
      { url: '/docs', priority: '0.8', changefreq: 'weekly' },
      { url: '/demo/board', priority: '0.7', changefreq: 'daily' },
      { url: '/demo/roadmap', priority: '0.7', changefreq: 'daily' },
      { url: '/demo/changelog', priority: '0.6', changefreq: 'weekly' }
    ];

    // Dynamic pages from projects
    const dynamicPages: Array<{ url: string; priority: string; changefreq: string; lastmod?: string }> = [];
    
    if (projects && projects.length > 0) {
      projects.forEach(project => {
        const lastmod = new Date(project.created_at).toISOString();
        dynamicPages.push(
          { url: `/${project.slug}/board`, priority: '0.8', changefreq: 'daily', lastmod },
          { url: `/${project.slug}/roadmap`, priority: '0.7', changefreq: 'daily', lastmod },
          { url: `/${project.slug}/changelog`, priority: '0.6', changefreq: 'weekly', lastmod }
        );
      });
    }

    const allPages = [...staticPages, ...dynamicPages];
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Fallback sitemap with static pages only
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/pricing</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/docs</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    return new NextResponse(fallbackSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
