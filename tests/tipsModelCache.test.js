import { beforeEach, describe, expect, it, vi } from "vitest";

// Keep the model fully offline: the mocked client forces the local-cache
// code paths, so no network or Supabase credentials are needed.
vi.mock("../src/utils/supabaseClient.js", () => ({ supabase: null }));

// Minimal storage stubs. `localStorageReads` counts real cache reads so the
// tests can prove the memory cache short-circuits them.
let localStorageReads = 0;
const backingStore = new Map();
const localStorageStub = {
  getItem: (key) => {
    localStorageReads += 1;
    return backingStore.has(key) ? backingStore.get(key) : null;
  },
  setItem: (key, value) => {
    backingStore.set(key, String(value));
  },
  removeItem: (key) => {
    backingStore.delete(key);
  },
};

beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", localStorageStub);
});

const loadModel = async () => {
  vi.resetModules();
  const { tipsModel } = await import("../src/models/tipsModel.js");
  return tipsModel;
};

describe("tipsModel — in-memory remount cache", () => {
  it("serves repeat loads from memory without re-reading storage", async () => {
    const tipsModel = await loadModel();
    backingStore.clear();
    localStorageReads = 0;

    const first = await tipsModel.getAll("user-1");
    expect(first).toEqual({});
    const readsAfterFirstLoad = localStorageReads;

    const second = await tipsModel.getAll("user-1");
    expect(second).toEqual(first);
    expect(localStorageReads).toBe(readsAfterFirstLoad);
  });

  it("reflects setTip writes on the next getAll", async () => {
    const tipsModel = await loadModel();
    backingStore.clear();

    await tipsModel.setTip("q-42", { text: "SOH-CAH-TOA" }, "user-2");
    const map = await tipsModel.getAll("user-2");

    expect(map["q-42"]).toBeDefined();
    expect(map["q-42"].text).toBe("SOH-CAH-TOA");
  });

  it("keeps per-user memory caches isolated", async () => {
    const tipsModel = await loadModel();
    backingStore.clear();

    await tipsModel.setTip("q-1", { text: "User A tip" }, "user-a");
    const mapB = await tipsModel.getAll("user-b");
    expect(mapB["q-1"]).toBeUndefined();

    const mapA = await tipsModel.getAll("user-a");
    expect(mapA["q-1"].text).toBe("User A tip");
  });

  it("expires after the TTL so fresh data is re-read from storage", async () => {
    const tipsModel = await loadModel();
    backingStore.clear();
    localStorageReads = 0;

    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      await tipsModel.getAll("user-3");
      const readsAfterFirstLoad = localStorageReads;

      vi.setSystemTime(61_000);
      await tipsModel.getAll("user-3");

      expect(localStorageReads).toBeGreaterThan(readsAfterFirstLoad);
    } finally {
      vi.useRealTimers();
    }
  });
});