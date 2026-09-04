import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
]

const staticAssetCsp =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none';"

const staticAssetHeaders = [
  ...securityHeaders,
  { key: 'Content-Security-Policy', value: staticAssetCsp },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  serverExternalPackages: ['@prisma/client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'nexo.coodee.dev'
      },
      {
        protocol: 'https',
        hostname: 'plane.so'
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/{avatars,user-covers}/**',
      }
    ],
  },
  cacheComponents: true,
  // Sem isso o Turbopack sobe até achar o package-lock.json solto em
  // /home/castrogusttavo e trata o $HOME inteiro como raiz do workspace,
  // quebrando a resolução de módulos do React Server Components manifest.
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    webpackMemoryOptimizations: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  headers: async () => [
    {
      source: '/_next/static/:path*',
      headers: staticAssetHeaders,
    },
    {
      source: '/favicon.ico',
      headers: staticAssetHeaders,
    },
    {
      source: '/:path*\\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)',
      headers: staticAssetHeaders,
    },
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
