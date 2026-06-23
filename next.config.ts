import type { NextConfig } from "next";
import { approvedImageHostnames } from "./src/lib/storefront-image";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

const isDockerBuild = process.env.DOCKER_BUILD === "1";

function imageRemotePatterns() {
  const hostnames = approvedImageHostnames();
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

  for (const hostname of hostnames) {
    patterns.push(
      { protocol: "https", hostname, pathname: "/**" },
      { protocol: "http", hostname, pathname: "/**" },
    );
  }

  return patterns;
}

const nextConfig: NextConfig = {
  // SITE_LAUNCH_AT must stay a runtime env var (Coolify). Do not add to `env` here —
  // that inlines an empty value at Docker build time and disables the launch gate.
  // Standalone keeps the runner image small (avoids export OOM after `next build` on 2GB VPS).
  ...(isDockerBuild ? { output: "standalone" as const } : {}),
  eslint: {
    // Lint in CI/dev (`npm run lint`); skip during `next build` to save VPS RAM.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Docker/Coolify: skip tsc in `next build` — run `npx tsc --noEmit` in CI/dev instead.
    ignoreBuildErrors: process.env.DOCKER_BUILD === "1",
  },
  productionBrowserSourceMaps: false,
  devIndicators: false,
  // Keep native/server deps external so dev HMR does not emit fragile vendor-chunks.
  serverExternalPackages: [
    "sharp",
    "pg",
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-backend-cpu",
    "nsfwjs",
    "framer-motion",
    "motion-dom",
    "motion-utils",
  ],
  // Allow bulk phone-photo uploads through App Router route handlers.
  // Without this, Next truncates multipart bodies above 10MB in dev.
  poweredByHeader: false,
  compress: true,
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
      skipDefaultConversion: true,
    },
  },
  experimental: {
    webpackMemoryOptimizations: true,
    optimizePackageImports: ["lucide-react", "recharts"],
    // Coolify / 2GB VPS: one CPU during `next build` avoids OOM from worker pools.
    ...(isDockerBuild ? { cpus: 1 } : {}),
    outputFileTracingIncludes: {
      "/api/orders/[orderId]/invoice": ["./src/lib/invoice-styles.css"],
    },
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
      {
        source: "/shop",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/shopping-cart",
        destination: "/cart",
        permanent: true,
      },
    ];
  },
  async headers() {
    const globalSecurityHeaders = Object.entries(SECURITY_HEADERS).map(
      ([key, value]) => ({ key, value }),
    );

    return [
      {
        source: "/:path*",
        headers: globalSecurityHeaders,
      },
      {
        source: "/sarjan-assets/client-avatars/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache",
          },
        ],
      },
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
        source: "/uploads/review-media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
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
        source: "/uploads/ai-products/:path*",
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
      {
        source: "/sarjan-sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/offline",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: imageRemotePatterns(),
  },
};

export default nextConfig;
