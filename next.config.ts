import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    instrumentationHook: true, // Enable OpenTelemetry instrumentation
  },
  // Explicitly enable edge runtime for API routes if needed
  // This ensures API routes are properly deployed
};

export default nextConfig;
