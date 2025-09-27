import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = createClient();

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get published releases
    const { data: releases, error: releasesError } = await supabase
      .from('changelog_releases')
      .select(`
        title,
        slug,
        excerpt,
        content,
        published_at,
        release_type,
        version
      `)
      .eq('project_id', project.id)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(20);

    if (releasesError) {
      console.error('Error fetching releases:', releasesError);
      return NextResponse.json({ error: 'Failed to fetch releases' }, { status: 500 });
    }

    // Generate RSS XML
    const baseUrl = request.nextUrl.origin;
    const projectUrl = `${baseUrl}/${slug}`;
    const changelogUrl = `${projectUrl}/changelog`;

    const rssItems = releases?.map(release => {
      const releaseUrl = `${changelogUrl}/${release.slug}`;
      const pubDate = new Date(release.published_at).toUTCString();
      
      return `
        <item>
          <title><![CDATA[${release.title}]]></title>
          <link>${releaseUrl}</link>
          <guid isPermaLink="true">${releaseUrl}</guid>
          <pubDate>${pubDate}</pubDate>
          <description><![CDATA[${release.excerpt || release.content.substring(0, 200)}...]]></description>
          ${release.version ? `<category>${release.version}</category>` : ''}
          <category>${release.release_type}</category>
        </item>
      `;
    }).join('') || '';

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${project.name} - Changelog]]></title>
    <link>${changelogUrl}</link>
    <description><![CDATA[${project.description || `Stay updated with the latest changes and improvements to ${project.name}.`}]]></description>
    <language>en-us</language>
    <managingEditor>noreply@signalsloop.com (${project.name})</managingEditor>
    <webMaster>noreply@signalsloop.com (${project.name})</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/${slug}/changelog/rss" rel="self" type="application/rss+xml"/>
    
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rssXml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error in RSS feed generation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
