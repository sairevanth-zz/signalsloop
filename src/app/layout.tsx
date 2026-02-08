import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Manrope, Plus_Jakarta_Sans, JetBrains_Mono, Fraunces, Inter } from "next/font/google";
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

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#FF4F00",
};

export const metadata: Metadata = {
  title: {
    default: "SignalsLoop - AI-Native Product OS for Modern PM Teams",
    template: "%s | SignalsLoop"
  },
  description: "The AI-native operating system for product teams. Turn user signals into shipped features with automated feedback analysis, competitive intelligence, and AI-powered roadmapping. From $19/mo.",
  keywords: ["product os", "ai product management", "product operations", "ai feedback analysis", "competitive intelligence", "product roadmap software", "canny alternative", "productboard alternative", "product management tool", "user voice alternative", "feature upvote board"],
  authors: [{ name: "SignalsLoop" }],
  creator: "SignalsLoop",
  publisher: "SignalsLoop",
  metadataBase: new URL("https://signalsloop.com"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SignalsLoop",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://signalsloop.com",
    title: "SignalsLoop - AI-Native Product OS for Modern PM Teams",
    description: "The AI-native operating system for product teams. Turn user signals into shipped features with automated feedback analysis, competitive intelligence, and AI-powered roadmapping.",
    siteName: "SignalsLoop",
  },
  twitter: {
    card: "summary_large_image",
    title: "SignalsLoop - AI-Native Product OS for Modern PM Teams",
    description: "Turn user signals into shipped features. AI-powered feedback analysis, competitive intelligence, and roadmapping.",
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
  alternates: {
    canonical: "https://signalsloop.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Widget script - uses SignalsLoop project API key
  const widgetScriptSrc = process.env.NEXT_PUBLIC_WIDGET_SCRIPT || "https://signalsloop.com/embed/sk_89efe32edf48184f641432ff26c6c5df.js";

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
        "description": "The AI-native operating system for product teams. Turn user signals into shipped features.",
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
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} ${fraunces.variable} ${inter.variable} antialiased touch-manipulation overflow-x-hidden`}
      >
        <ThemeProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" />
        {widgetScriptSrc && <Script src={widgetScriptSrc} strategy="afterInteractive" />}
      </body>
    </html>
  );
}
