import { describe, it, expect } from "vitest";
import { isAssetLikePath } from "../src/utils/assetPath";
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_STORAGE_KEY,
  clearChunkReloadAttempted,
  isChunkLoadError,
  isReactDispatcherMismatchError,
  isStaleModuleError,
  markChunkReloadAttempted,
  shouldAttemptChunkReload,
} from "../src/utils/lazyWithRetry";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe("isAssetLikePath", () => {
  it("flags hashed bundles, service worker, manifest, and static files as assets", () => {
    expect(isAssetLikePath("/assets/MockExam-B3aZ51AP.js")).toBe(true);
    expect(isAssetLikePath("/assets/index-CWV745au.css")).toBe(true);
    expect(isAssetLikePath("/sw.js")).toBe(true);
    expect(isAssetLikePath("/manifest.webmanifest")).toBe(true);
    expect(isAssetLikePath("/icon-192.png")).toBe(true);
    expect(isAssetLikePath("/assets/something-without-extension")).toBe(true);
  });

  it("treats SPA routes and root paths as non-asset HTML routes", () => {
    expect(isAssetLikePath("/")).toBe(false);
    expect(isAssetLikePath("/mock")).toBe(false);
    expect(isAssetLikePath("/tips/123")).toBe(false);
    expect(isAssetLikePath("")).toBe(false);
  });
});

describe("isChunkLoadError", () => {
  it("detects dynamic import and chunk-loading errors across browsers", () => {
    expect(
      isChunkLoadError(
        new TypeError("Failed to fetch dynamically imported module: https://qbank-hbgo.onrender.com/assets/MockExam-B3aZ51AP.js")
      )
    ).toBe(true);
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Expected a JavaScript-or-Wasm module script"))).toBe(true);

    const webpackStyle = new Error("Loading chunk 42 failed.");
    webpackStyle.name = "ChunkLoadError";
    expect(isChunkLoadError(webpackStyle)).toBe(true);
  });

  it("ignores unrelated runtime errors", () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(new Error("Network error 500"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe("isReactDispatcherMismatchError & isStaleModuleError", () => {
  it("detects null React dispatcher hook errors caused by mismatched Vite dep hashes", () => {
    expect(
      isReactDispatcherMismatchError(new TypeError("Cannot read properties of null (reading 'useState')"))
    ).toBe(true);
    expect(
      isStaleModuleError(new TypeError("Cannot read properties of null (reading 'useEffect')"))
    ).toBe(true);
    expect(
      isStaleModuleError(new TypeError("null is not an object (evaluating 'dispatcher.useState')"))
    ).toBe(true);
    expect(isStaleModuleError(new Error("Invalid hook call."))).toBe(true);
  });

  it("ignores unrelated null property errors", () => {
    expect(
      isReactDispatcherMismatchError(new TypeError("Cannot read properties of null (reading 'id')"))
    ).toBe(false);
    expect(isStaleModuleError(new Error("Network error 500"))).toBe(false);
  });
});

describe("chunk reload loop protection", () => {
  it("allows one reload initially, blocks within cooldown, and resets cleanly", () => {
    const storage = createMemoryStorage();
    const t0 = 1_000_000;

    expect(shouldAttemptChunkReload(storage, t0)).toBe(true);

    markChunkReloadAttempted(storage, t0);
    expect(storage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBe(String(t0));

    // Immediate retry inside cooldown must be blocked so we never reload-loop.
    expect(shouldAttemptChunkReload(storage, t0 + 1_000)).toBe(false);
    expect(shouldAttemptChunkReload(storage, t0 + CHUNK_RELOAD_COOLDOWN_MS - 1)).toBe(false);

    // Past cooldown or after successful chunk load, reloading is allowed again.
    expect(shouldAttemptChunkReload(storage, t0 + CHUNK_RELOAD_COOLDOWN_MS)).toBe(true);

    clearChunkReloadAttempted(storage);
    expect(shouldAttemptChunkReload(storage, t0 + 500)).toBe(true);
  });

  it("returns false safely when storage is unavailable", () => {
    expect(shouldAttemptChunkReload(null, 1_000_000)).toBe(false);
  });
});
