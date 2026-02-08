import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features - AI Feedback Categorization, Roadmaps & More',
  description: 'Explore SignalsLoop features: AI auto-categorization, duplicate detection, priority scoring with 5 AI models, smart replies, public roadmaps, changelogs, feedback widgets, and integrations.',
  keywords: ['ai feedback categorization', 'duplicate feedback detection', 'product roadmap tool', 'feedback widget', 'feature request tracking', 'ai priority scoring', 'smart replies feedback', 'changelog management'],
  openGraph: {
    title: 'SignalsLoop Features - AI-Powered Feedback Management',
    description: 'AI auto-categorization, duplicate detection, priority scoring, public roadmaps, changelogs, and more.',
    url: 'https://signalsloop.com/features',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SignalsLoop Features - AI-Powered Feedback Management',
    description: 'AI auto-categorization, duplicate detection, priority scoring, public roadmaps, changelogs, and more.',
  },
  alternates: {
    canonical: 'https://signalsloop.com/features',
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
