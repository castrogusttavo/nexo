import { createRequire } from "node:module";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { EXCALIDRAW_ASSET_PATH } from "./lib/excalidraw/asset-path";
import { syncExcalidrawFonts } from "./lib/excalidraw/sync-fonts";
import {
  POSTHOG_DEFAULT_HOST,
  POSTHOG_PROXY_PATH,
  posthogAssetHost,
} from "./lib/posthog/constants";

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

// --- PostHog reverse proxy ---------------------------------------------------
// The browser only ever talks to `/ingest/*` on our own origin, which Next
// rewrites to PostHog. Two things are bought with it: `connect-src` stays at
// `'self'` (no third-party host in the CSP at all), and the requests survive
// the blocklists that recognise `*.i.posthog.com` by name. The cost is that
// analytics traffic transits our server — acceptable for the volume this
// config allows (page views and named events, no autocapture, no recording).
//
// It exists only when a key is configured, so a deployment without PostHog has
// no `/ingest` route, no external rewrite and no trailing-slash change.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_DEFAULT_HOST;

const posthogProxy = posthogKey
  ? {
      // Every posthog-js endpoint ends in a slash (`/e/`, `/i/`, `/s/`,
      // `/flags/`). Next's default trailing-slash normalisation would answer
      // each of them with a 308 before the rewrite is ever consulted, turning
      // every event into two round trips.
      skipTrailingSlashRedirect: true,
      rewrites: async () => [
        {
          source: `${POSTHOG_PROXY_PATH}/static/:path*`,
          destination: `${posthogAssetHost(posthogHost)}/static/:path*`,
        },
        {
          source: `${POSTHOG_PROXY_PATH}/:path*`,
          destination: `${posthogHost}/:path*`,
        },
      ],
    }
  : {};

// --- Sentry ------------------------------------------------------------------
// Source maps are uploaded only when the build is handed credentials, which is
// the CD image build and nothing else: CI, `pnpm build` on a laptop and any
// fork build run with none of these set, and must not fail for it.
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const canUploadSourcemaps = Boolean(
  sentryOrg && sentryProject && sentryAuthToken,
);

const nextConfig: NextConfig = {
  ...posthogProxy,
  poweredByHeader: false,
  output: 'standalone',
  // Turbopack emits no browser source map unless asked, and the Sentry plugin
  // does not ask for us: without this it created the release and had nothing
  // to upload, so every client stack trace in Sentry was minified (no
  // `_sentryDebugIds` in any chunk, `debug_meta.images: 0` on the event).
  // Tied to the upload credentials on purpose — the maps must not be emitted
  // where nothing will delete them afterwards. In the CD build,
  // `sourcemaps.deleteSourcemapsAfterUpload` removes the files and strips the
  // `sourceMappingURL` comments once Sentry has them, so the traces stay
  // readable in Sentry and unreadable in the browser.
  productionBrowserSourceMaps: canUploadSourcemaps,
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

export default withSentryConfig(nextConfig, {
  org: sentryOrg,
  project: sentryProject,
  authToken: sentryAuthToken,
  silent: !process.env.CI,
  telemetry: false,
  // `disableLogger` / `automaticVercelMonitors` are deliberately absent: both
  // are webpack-only options and this project builds with Turbopack, so the
  // SDK only warns about them. We do not deploy to Vercel either.
  widenClientFileUpload: false,
  release: {
    // The git SHA the CD build already knows (Dockerfile build arg), so an
    // issue points at the commit that shipped it.
    name: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    create: canUploadSourcemaps,
    finalize: canUploadSourcemaps,
  },
  sourcemaps: {
    disable: !canUploadSourcemaps,
    deleteSourcemapsAfterUpload: true,
  },
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
  },
  // A credential problem, a network blip or a rate limit on Sentry's side must
  // never turn into a failed deploy. The build continues and says so.
  errorHandler: (error) => {
    console.warn(`[sentry] source map upload skipped: ${error.message}`);
  },
});
