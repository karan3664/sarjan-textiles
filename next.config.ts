import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // Keep sharp external so dev server does not emit fragile vendor-chunks after cache churn.
  serverExternalPackages: [
    "sharp",
    "pg",
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-backend-cpu",
    "nsfwjs",
  ],
  // Allow bulk phone-photo uploads through App Router route handlers.
  // Without this, Next truncates multipart bodies above 10MB in dev.
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "80mb",
    },
    middlewareClientMaxBodySize: "80mb",
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.sarjantextiles.com" }],
        destination: "https://sarjantextiles.com/:path*",
        permanent: true,
      },
      {
        source: "/forget-password",
        destination: "/forgot-password",
        permanent: true,
      },
      {
        source: "/terms",
        destination: "/term-of-use",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sarjan-assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sarjan-assets/:path*.avif",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/uploads/cms/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/template/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/downloads/:path*.apk",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
      {
        source: "/api/download/apk",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
