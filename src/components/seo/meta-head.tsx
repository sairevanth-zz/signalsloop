'use client';

import Head from 'next/head';
import { usePathname } from 'next/navigation';

interface MetaHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  siteName?: string;
  noIndex?: boolean;
}

export function MetaHead({
  title = 'SignalLoop - Simple Feedback Boards & Public Roadmaps',
  description = 'Collect user feedback, let users vote on features, and show progress with public roadmaps. 2-line install widget for any website.',
  image = '/og-default.png',
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  siteName = 'SignalLoop',
  noIndex = false
}: MetaHeadProps) {
  const pathname = usePathname();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://signalloop.com';
  const fullUrl = `${baseUrl}${pathname}`;
  const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:creator" content="@signalloop" />
      <meta name="twitter:site" content="@signalloop" />
      
      {/* Article specific */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      
      {/* Structured Data - Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "SignalLoop",
            "description": "Simple feedback boards and public roadmaps for SaaS products",
            "url": baseUrl,
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "19",
              "priceCurrency": "USD",
              "priceValidUntil": "2025-12-31"
            },
            "aggregateRating": {
              "@type": "AggregateRating", 
              "ratingValue": "4.8",
              "ratingCount": "127"
            }
          })
        }}
      />
    </Head>
  );
}

// Hook for dynamic page titles
export function usePageTitle(baseTitle: string, projectName?: string) {
  if (projectName) {
    return `${baseTitle} - ${projectName} | SignalLoop`;
  }
  return `${baseTitle} | SignalLoop`;
}

// Utility to generate Open Graph image URL
export function generateOGImage(params: {
  title: string;
  subtitle?: string;
  votes?: number;
  status?: string;
  type?: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://signalloop.com';
  const searchParams = new URLSearchParams();
  
  searchParams.set('title', params.title.substring(0, 60));
  if (params.subtitle) searchParams.set('subtitle', params.subtitle.substring(0, 80));
  if (params.votes) searchParams.set('votes', params.votes.toString());
  if (params.status) searchParams.set('status', params.status);
  if (params.type) searchParams.set('type', params.type);
  
  return `${baseUrl}/api/og?${searchParams.toString()}`;
}

// Legacy function for backward compatibility
export function generateOGImageLegacy(
  title: string, 
  subtitle?: string, 
  votes?: number,
  status?: string
) {
  return generateOGImage({ title, subtitle, votes, status });
}
