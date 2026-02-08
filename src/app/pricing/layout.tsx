import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing - Affordable AI Feedback Management',
  description: 'SignalsLoop pricing starts at $19/mo with a free forever plan. Compare vs Canny ($99/mo), ProductBoard ($299/mo). AI-powered feedback categorization, roadmaps, and changelogs included.',
  keywords: ['feedback tool pricing', 'canny alternative pricing', 'productboard alternative pricing', 'affordable feedback management', 'free feedback tool', 'product management pricing'],
  openGraph: {
    title: 'SignalsLoop Pricing - From $19/mo | Free Plan Available',
    description: 'AI-powered feedback management at a fraction of competitor pricing. Free forever plan + Pro from $19/mo.',
    url: 'https://signalsloop.com/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SignalsLoop Pricing - From $19/mo | Free Plan Available',
    description: 'AI-powered feedback management at a fraction of competitor pricing. Free forever plan + Pro from $19/mo.',
  },
  alternates: {
    canonical: 'https://signalsloop.com/pricing',
  },
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does SignalsLoop cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SignalsLoop offers a free forever plan with core features. The Pro plan starts at $19/month (or $15.83/month billed annually), which is 80% cheaper than competitors like Canny ($99/mo) and ProductBoard ($299/mo)."
      }
    },
    {
      "@type": "Question",
      "name": "What's included in the free plan?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The free plan includes 1 project, a public feedback board, public roadmap, basic changelog, community voting, and up to 50 feedback posts. No credit card required."
      }
    },
    {
      "@type": "Question",
      "name": "How does SignalsLoop compare to Canny and ProductBoard?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SignalsLoop provides AI-powered feedback categorization, duplicate detection, and priority scoring starting at $19/mo. Canny starts at $99/mo and ProductBoard at $299/mo. SignalsLoop includes features like AI auto-categorization and smart replies that competitors charge extra for."
      }
    },
    {
      "@type": "Question",
      "name": "Can I try SignalsLoop before upgrading to Pro?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, SignalsLoop offers a free forever plan so you can try the platform with no time limit. You can upgrade to Pro anytime to unlock AI features, unlimited projects, and advanced integrations."
      }
    }
  ]
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      {children}
    </>
  );
}
