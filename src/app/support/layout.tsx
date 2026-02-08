import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support - Help & Contact',
  description: 'Get help with SignalsLoop. Contact our support team for feedback management, billing, integrations, and technical questions.',
  openGraph: {
    title: 'SignalsLoop Support - Help & Contact',
    description: 'Get help with SignalsLoop feedback management platform.',
    url: 'https://signalsloop.com/support',
    type: 'website',
  },
  alternates: {
    canonical: 'https://signalsloop.com/support',
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
