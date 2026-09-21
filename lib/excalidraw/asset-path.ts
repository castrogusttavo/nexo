// Where the self-hosted excalidraw fonts are served from. Shared by the client
// (which hands it to excalidraw as window.EXCALIDRAW_ASSET_PATH) and by
// next.config.ts (which copies the fonts to public/ + this path), so the two
// can never disagree.
//
// excalidraw 0.18 builds each font URL as `new URL('./fonts/<Family>/<file>',
// EXCALIDRAW_ASSET_PATH)` and, when the global is unset, from
// https://esm.sh/@excalidraw/excalidraw@<version>/dist/prod/ — which the CSP's
// `font-src 'self'` blocks. Hence a same-origin path.
export const EXCALIDRAW_ASSET_PATH = '/static/excalidraw/'
