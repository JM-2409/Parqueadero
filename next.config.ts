import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  sw: "sw.js",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    exclude: [
      ({ url }: { url: URL }) => {
        if (!url || !url.pathname) return false;
        if (url.pathname.startsWith("/api/")) return true;
        if (url.pathname.endsWith(".html")) return true;
        return false;
      },
    ],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\/api\/.*/,
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ request }: { request: any }) => request.destination === "document",
        handler: "NetworkOnly",
      },
      {
        urlPattern: /\.(?:js|css|woff2?|png|svg|jpg|jpeg|gif|webp)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**", // This allows any path under the hostname
      },
    ],
  },
  output: "standalone",
  transpilePackages: ["motion"],
  turbopack: {},
  webpack: (config, { dev }) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === "true") {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default withPWA(nextConfig);
