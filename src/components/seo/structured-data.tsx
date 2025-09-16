'use client';

import Script from 'next/script';

interface StructuredDataProps {
  type: 'organization' | 'software' | 'article' | 'breadcrumb' | 'feedback';
  data: Record<string, unknown>;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const getStructuredData = () => {
    switch (type) {
      case 'organization':
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "SignalLoop",
          "url": "https://signalloop.com",
          "logo": "https://signalloop.com/logo.png",
          "description": "Simple feedback boards and public roadmaps for SaaS products",
          "sameAs": [
            "https://twitter.com/signalloop",
            "https://github.com/signalloop"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "email": "support@signalloop.com"
          }
        };

      case 'software':
        return {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": data.name || "SignalLoop",
          "description": data.description || "Simple feedback boards and public roadmaps for SaaS products",
          "url": data.url || "https://signalloop.com",
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
          },
          "author": {
            "@type": "Organization",
            "name": "SignalLoop"
          }
        };

      case 'article':
        return {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": data.title,
          "description": data.description,
          "image": data.image,
          "author": {
            "@type": "Person",
            "name": data.author || "SignalLoop"
          },
          "publisher": {
            "@type": "Organization",
            "name": "SignalLoop",
            "logo": {
              "@type": "ImageObject",
              "url": "https://signalloop.com/logo.png"
            }
          },
          "datePublished": data.publishedTime,
          "dateModified": data.modifiedTime,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": data.url
          }
        };

      case 'breadcrumb':
        return {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": (data.items as Array<{ name: string; url: string }>).map((item, index: number) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
          }))
        };

      case 'feedback':
        return {
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          "name": data.title,
          "description": data.description,
          "author": {
            "@type": "Person",
            "name": data.author || "Anonymous User"
          },
          "dateCreated": data.createdAt,
          "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/LikeAction",
            "userInteractionCount": data.votes || 0
          },
          "keywords": (data.tags as string[])?.join(', ') || 'feedback, feature request, user feedback'
        };

      default:
        return data;
    }
  };

  return (
    <Script
      id={`structured-data-${type}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(getStructuredData(), null, 2)
      }}
    />
  );
}

// Utility functions for common structured data
export const StructuredDataUtils = {
  createOrganizationData: (data: Record<string, unknown>) => ({
    type: 'organization' as const,
    data
  }),

  createSoftwareData: (name: string, description: string, url: string) => ({
    type: 'software' as const,
    data: { name, description, url }
  }),

  createArticleData: (article: {
    title: string;
    description: string;
    image: string;
    author?: string;
    publishedTime: string;
    modifiedTime?: string;
    url: string;
  }) => ({
    type: 'article' as const,
    data: article
  }),

  createBreadcrumbData: (items: Array<{ name: string; url: string }>) => ({
    type: 'breadcrumb' as const,
    data: { items }
  }),

  createFeedbackData: (feedback: {
    title: string;
    description: string;
    author?: string;
    createdAt: string;
    votes?: number;
    tags?: string[];
  }) => ({
    type: 'feedback' as const,
    data: feedback
  })
};
