import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignalsLoop",
  description: "Feedback and feature request management",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased touch-manipulation`}
      >
        {children}
        <script src="https://www.signalsloop.com/embed/sk_5qfjcjroywm9kbplveuc.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress console errors for failed resource loading
              window.addEventListener('error', function(e) {
                if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT')) {
                  e.preventDefault();
                  return false;
                }
              }, true);

              // Suppress unhandled promise rejections
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && (
                  e.reason.message.includes('Failed to fetch') ||
                  e.reason.message.includes('NetworkError') ||
                  e.reason.message.includes('fetch')
                )) {
                  e.preventDefault();
                  return false;
                }
              });

              // Intercept console.error to filter Supabase 400 errors
              (function() {
                const originalError = console.error;
                console.error = function(...args) {
                  const msg = args.join(' ');
                  // Suppress Supabase 400 errors for votes table
                  if (msg.includes('400') && msg.includes('supabase') && msg.includes('votes')) {
                    return;
                  }
                  originalError.apply(console, args);
                };
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
// Deployment trigger Tue Sep 16 11:09:20 CDT 2025
