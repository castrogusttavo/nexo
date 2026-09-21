import { createRequire } from "node:module";
import path from "node:path";
import type { NextConfig } from "next";
import { EXCALIDRAW_ASSET_PATH } from "./lib/excalidraw/asset-path";
import { syncExcalidrawFonts } from "./lib/excalidraw/sync-fonts";

// Self-host excalidraw's fonts (the wiki's drawing block) instead of letting
// it fetch them from esm.sh, which `font-src 'self'` blocks. Runs whenever
// Next loads this config (`next dev`, `next build`, the Dockerfile's build),
// before public/ is read, and re-copies only when the installed package
// version changes. The standalone server inlines the config, so production
// never touches the filesystem for this.
syncExcalidrawFonts({
  packageDir: path.dirname(
    path.dirname(
      path.dirname(createRequire(__filename).resolve("@excalidraw/excalidraw")),
    ),
  ),
  targetDir: path.join(__dirname, "public", EXCALIDRAW_ASSET_PATH),
});

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
        hostname: 'nexopm.com'
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
  // Without this, Turbopack walks up until it finds the stray package-lock.json
  // in /home/castrogusttavo and treats the whole $HOME as the workspace root,
  // breaking React Server Components manifest module resolution.
  turbopack: {
    root: path.join(__dirname),
    rules: {
      // Points excalidraw's hard-coded esm.sh font fallback at the
      // self-hosted copy above; see lib/excalidraw/cdn-fallback-loader.cjs.
      "*.js": {
        condition: {
          all: [
            "browser",
            { path: /@excalidraw\/excalidraw\/dist\// },
            { content: /ASSETS_FALLBACK_URL/ },
          ],
        },
        loaders: [
          {
            loader: path.join(__dirname, "lib/excalidraw/cdn-fallback-loader.cjs"),
            options: { assetPath: EXCALIDRAW_ASSET_PATH },
          },
        ],
      },
    },
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
