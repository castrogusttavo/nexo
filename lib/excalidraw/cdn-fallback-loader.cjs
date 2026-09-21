// Turbopack (webpack-compatible) loader for @excalidraw/excalidraw's browser
// bundle, wired in next.config.ts.
//
// excalidraw 0.18 gives every font face two sources:
//   url(<EXCALIDRAW_ASSET_PATH>/fonts/...), url(https://esm.sh/.../fonts/...)
// The esm.sh one is appended unconditionally (ExcalidrawFontFace.createUrls),
// and Chromium vets every source of a FontFace against the CSP up front, so
// even with the fonts self-hosted each face logs a `font-src` violation for a
// request that never had to happen. This rewrites the fallback base to the
// same self-hosted path, so both sources point at this origin.
//
// If a new excalidraw release reshapes that line, the loader throws instead of
// silently letting the CDN come back: the fix is to update the pattern below.

const FALLBACK =
  /(["']ASSETS_FALLBACK_URL["']\s*,\s*)`https:\/\/esm\.sh\/[\s\S]*?\/dist\/prod\/`/

function stripCdnFallback(source, assetPath) {
  if (!FALLBACK.test(source)) {
    throw new Error(
      'cdn-fallback-loader: ASSETS_FALLBACK_URL no longer matches the expected esm.sh template; update lib/excalidraw/cdn-fallback-loader.cjs for this excalidraw version',
    )
  }
  // The base must be absolute (it is passed to `new URL(path, base)`). This
  // only runs in the browser bundle, where window.location exists.
  return source.replace(
    FALLBACK,
    `$1new URL(${JSON.stringify(assetPath)}, window.location.origin).href`,
  )
}

module.exports = function cdnFallbackLoader(source) {
  const { assetPath } = this.getOptions()
  return stripCdnFallback(source, assetPath)
}
module.exports.stripCdnFallback = stripCdnFallback
