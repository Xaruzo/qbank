const STATIC_FILE_EXT_RE =
  /\.(?:js|mjs|cjs|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|wasm|json|webmanifest|txt|xml)$/i;

/**
 * Returns true when a URL pathname represents a static asset (hashed bundle,
 * image, font, service worker, manifest, etc.) rather than an SPA HTML route.
 * Missing asset paths must return 404 rather than falling back to index.html,
 * so stale clients never receive text/html for an ES module import.
 */
export function isAssetLikePath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/assets/")) return true;
  if (pathname === "/sw.js" || pathname === "/manifest.webmanifest") return true;
  return STATIC_FILE_EXT_RE.test(pathname);
}
