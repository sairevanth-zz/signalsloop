import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Manrope, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Feedback Management - Auto-Categorize & Prioritize | SignalsLoop",
    template: "%s | SignalsLoop"
  },
  description: "AI-powered feedback management for product teams. Auto-categorize user feedback, detect duplicates, score priorities with 5 AI models. From $19/mo vs $99-299/mo competitors. Free forever plan available.",
  keywords: ["feedback management", "product feedback tool", "ai feedback analysis", "feature request management", "user feedback software", "canny alternative", "productboard alternative", "feedback categorization", "product management tool"],
  authors: [{ name: "SignalsLoop" }],
  creator: "SignalsLoop",
  publisher: "SignalsLoop",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SignalsLoop",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://signalsloop.com",
    title: "AI Feedback Management - Auto-Categorize & Prioritize | SignalsLoop",
    description: "AI-powered feedback management for product teams. Auto-categorize, detect duplicates, score priorities. From $19/mo vs $99-299/mo competitors.",
    siteName: "SignalsLoop",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Feedback Management - Auto-Categorize & Prioritize | SignalsLoop",
    description: "AI-powered feedback management for product teams. From $19/mo vs $99-299/mo competitors.",
    creator: "@signalsloop",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const widgetScriptSrc =
    process.env.NEXT_PUBLIC_WIDGET_SCRIPT ?? "https://signalsloop.com/embed/demo.js";

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://signalsloop.com/#organization",
        "name": "SignalsLoop",
        "url": "https://signalsloop.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://signalsloop.com/logo.png"
        },
        "sameAs": [
          "https://twitter.com/signalsloop"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://signalsloop.com/#website",
        "url": "https://signalsloop.com",
        "name": "SignalsLoop",
        "publisher": {
          "@id": "https://signalsloop.com/#organization"
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "SignalsLoop",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "19",
          "priceCurrency": "USD",
          "priceValidUntil": "2026-12-31",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5.0",
          "ratingCount": "100",
          "bestRating": "5",
          "worstRating": "1"
        },
        "description": "AI-powered feedback management for product teams. Auto-categorize, detect duplicates, score priorities.",
        "featureList": [
          "AI Auto-Categorization",
          "Duplicate Detection",
          "Priority Scoring",
          "Smart Replies",
          "Public Roadmap",
          "Feedback Widget",
          "API & Webhooks",
          "CSV Import/Export",
          "Slack & Discord Integration"
        ]
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} antialiased touch-manipulation overflow-x-hidden`}
      >
        <ThemeProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" />
        <Script src={widgetScriptSrc} strategy="afterInteractive" />
      </body>
    </html>
  );
}
// Deployment trigger Mon Oct 28 22:34:00 CDT 2025
