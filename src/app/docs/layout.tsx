import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation - Setup Guide & Widget Integration',
  description: 'Learn how to set up SignalsLoop, embed the feedback widget, integrate with Slack and Discord, import CSV data, and use the API for your product feedback workflow.',
  keywords: ['signalsloop documentation', 'feedback widget setup', 'feedback tool api', 'product feedback integration', 'slack feedback integration'],
  openGraph: {
    title: 'SignalsLoop Documentation - Setup & Integration Guide',
    description: 'Complete guide to setting up SignalsLoop, embedding widgets, and integrating with your tools.',
    url: 'https://signalsloop.com/docs',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'SignalsLoop Documentation',
    description: 'Complete guide to setting up SignalsLoop, embedding widgets, and integrating with your tools.',
  },
  alternates: {
    canonical: 'https://signalsloop.com/docs',
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
