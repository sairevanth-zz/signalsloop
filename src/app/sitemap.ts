import { MetadataRoute } from 'next';
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://signalsloop.com';
  
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
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/pricing`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/features`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/docs`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/support`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/privacy`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/demo/board`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      },
      {
        url: `${baseUrl}/demo/roadmap`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      },
      {
        url: `${baseUrl}/demo/changelog`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      },
    ];

    // Dynamic pages from projects
    const dynamicPages: MetadataRoute.Sitemap = [];
    
    if (projects && projects.length > 0) {
      projects.forEach(project => {
        const lastModified = new Date(project.created_at);
        dynamicPages.push(
          {
            url: `${baseUrl}/${project.slug}/board`,
            lastModified,
            changeFrequency: 'daily',
            priority: 0.8,
          },
          {
            url: `${baseUrl}/${project.slug}/roadmap`,
            lastModified,
            changeFrequency: 'daily',
            priority: 0.7,
          },
          {
            url: `${baseUrl}/${project.slug}/changelog`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.6,
          }
        );
      });
    }

    return [...staticPages, ...dynamicPages];
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return static pages as fallback
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/pricing`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/docs`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
    ];
  }
}
