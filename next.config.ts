import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' data: https:",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://*.clerk.com https://*.clerk.accounts.dev https://*.onnex.pt https://browser.sentry-cdn.com https://challenges.cloudflare.com`,
      "connect-src 'self' blob: data: https://*.clerk.com https://*.clerk.accounts.dev https://*.onnex.pt https://api.clerk.com https://clerk-telemetry.com https://*.sentry.io https://*.ingest.sentry.io https://vitals.vercel-insights.com https://*.public.blob.vercel-storage.com https://*.blob.vercel-storage.com https://blob.vercel-storage.com https://vercel.com https://api.vercel.com",
      "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.onnex.pt https://challenges.cloudflare.com https://www.google.com",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Self-hosting (VPS/Docker): gera .next/standalone com servidor mínimo.
  // Na Vercel esta opção é ignorada (a plataforma usa o próprio adapter),
  // por isso é segura em ambos os ambientes durante a migração.
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.clerk.com" },
      { protocol: "https", hostname: "**.clerk.accounts.dev" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    // A homepage (/) serve a landing estatica em public/landing.html.
    // Mantem o URL "/" (rewrite, nao redirect) e fica isolada do design da app.
    return [
      {
        source: "/",
        destination: "/landing.html",
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: {
    disable: Boolean(!process.env.SENTRY_AUTH_TOKEN),
  },
});
