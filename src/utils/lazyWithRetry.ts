import { lazy, type ComponentType } from "react";

export const CHUNK_RELOAD_STORAGE_KEY = "qbank-chunk-reload-ts";
export const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

const CHUNK_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "importing a module script failed",
  "error loading dynamically imported module",
  "expected a javascript-or-wasm module script",
  "loading chunk",
  "chunkloaderror",
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name || "") : "";
  const message =
    typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : String(error);
  const combined = `${name} ${message}`.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => combined.includes(pattern));
}

const REACT_DISPATCHER_HOOK_RE =
  /reading ['"]?use(?:state|effect|layouteffect|ref|memo|callback|context|reducer|syncExternalStore)['"]?|evaluating ['"]?dispatcher\.use(?:state|effect|layouteffect|ref|memo|callback|context|reducer)['"]?|dispatcher is null|invalid hook call/i;

export function isReactDispatcherMismatchError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : String(error);
  if (!message) return false;
  const lower = message.toLowerCase();
  if (lower.includes("invalid hook call")) return true;
  if (
    (lower.includes("cannot read properties of null") ||
      lower.includes("null is not an object") ||
      lower.includes("dispatcher is null")) &&
    REACT_DISPATCHER_HOOK_RE.test(message)
  ) {
    return true;
  }
  return false;
}

export function isStaleModuleError(error: unknown): boolean {
  return isChunkLoadError(error) || isReactDispatcherMismatchError(error);
}

export function shouldAttemptChunkReload(
  storage: Pick<Storage, "getItem"> | null | undefined,
  now = Date.now(),
  key = CHUNK_RELOAD_STORAGE_KEY,
  cooldownMs = CHUNK_RELOAD_COOLDOWN_MS
): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(key);
    if (!raw) return true;
    const lastTs = Number(raw);
    if (!Number.isFinite(lastTs) || lastTs <= 0) return true;
    return now - lastTs >= cooldownMs;
  } catch {
    return false;
  }
}

export function markChunkReloadAttempted(
  storage: Pick<Storage, "setItem"> | null | undefined,
  now = Date.now(),
  key = CHUNK_RELOAD_STORAGE_KEY
): void {
  if (!storage) return;
  try {
    storage.setItem(key, String(now));
  } catch {}
}

export function clearChunkReloadAttempted(
  storage: Pick<Storage, "removeItem"> | null | undefined,
  key = CHUNK_RELOAD_STORAGE_KEY
): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {}
}

export function tryReloadForChunkError(): boolean {
  if (typeof window === "undefined") return false;
  const storage = (() => {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  })();

  if (!shouldAttemptChunkReload(storage)) {
    return false;
  }

  markChunkReloadAttempted(storage);
  window.location.reload();
  return true;
}

/**
 * Wraps React.lazy so a stale-chunk import error after a new deployment
 * triggers a single guarded page reload instead of crashing ErrorBoundary.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      if (typeof window !== "undefined") {
        try {
          clearChunkReloadAttempted(window.sessionStorage);
        } catch {}
      }
      return mod;
    } catch (error) {
      if (isChunkLoadError(error) && tryReloadForChunkError()) {
        // Keep Suspense visible briefly while the browser reloads cleanly.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
