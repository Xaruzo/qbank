import { FAVORITES_KEY } from "../constants/appConstants";
import { supabase } from "../utils/supabaseClient";

const FAVORITES_CACHE_KEY = "cse-qbank-favorites-cache-v1";
const FAVORITES_PENDING_KEY = "cse-qbank-favorites-pending-v1";
const USER_FAVORITES_TABLE = "user_favorites";
let hasLoggedMissingFavoritesTable = false;

const safeParse = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const normalizeFavoritesIds = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((id) => typeof id === "string" && id.trim());
};

const normalizePendingMap = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value).reduce((acc, [questionId, op]) => {
    if (!questionId || !op || typeof op !== "object") return acc;
    if (typeof op.added !== "boolean") return acc;

    acc[questionId] = {
      questionId,
      added: op.added,
      updatedAt: typeof op.updatedAt === "string" ? op.updatedAt : new Date().toISOString(),
    };
    return acc;
  }, {});
};

const readValue = async (key) => {
  if (window.storage && typeof window.storage.get === "function") {
    try {
      const result = await window.storage.get(key);
      return result?.value ?? null;
    } catch {}
  }
  return localStorage.getItem(key);
};

const removeValue = async (key) => {
  if (window.storage && typeof window.storage.set === "function") {
    try {
      await window.storage.set(key, "[]");
    } catch {}
  }
  localStorage.removeItem(key);
};

const writeValue = async (key, value) => {
  if (window.storage && typeof window.storage.set === "function") {
    try {
      await window.storage.set(key, value);
      return;
    } catch {}
  }
  try { localStorage.setItem(key, value); } catch (_) {}
};

const getFavoritesCacheKey = (userId) => (userId ? `${FAVORITES_CACHE_KEY}:${userId}` : FAVORITES_KEY);
const getPendingFavoritesKey = (userId) => (userId ? `${FAVORITES_PENDING_KEY}:${userId}` : null);

const readFavoritesCache = async (userId = null) => {
  const raw = await readValue(getFavoritesCacheKey(userId));
  return normalizeFavoritesIds(safeParse(raw || "[]", []));
};

const writeFavoritesCache = async (ids, userId = null) => {
  await writeValue(getFavoritesCacheKey(userId), JSON.stringify(normalizeFavoritesIds(ids)));
};

const readPendingMap = async (userId) => {
  if (!userId) return {};
  const key = getPendingFavoritesKey(userId);
  const raw = await readValue(key);
  return normalizePendingMap(safeParse(raw || "{}", {}));
};

const writePendingMap = async (map, userId) => {
  if (!userId) return;
  const key = getPendingFavoritesKey(userId);
  await writeValue(key, JSON.stringify(normalizePendingMap(map)));
};

const enqueuePendingOperation = async (questionId, operation, userId) => {
  if (!userId || !questionId) return;
  const pending = await readPendingMap(userId);
  pending[questionId] = {
    questionId,
    updatedAt: new Date().toISOString(),
    ...operation,
  };
  await writePendingMap(pending, userId);
};

const dequeuePendingOperation = async (questionId, userId) => {
  if (!userId || !questionId) return;
  const pending = await readPendingMap(userId);
  if (!pending[questionId]) return;
  delete pending[questionId];
  await writePendingMap(pending, userId);
};

const applyPendingToFavoriteIds = (baseIds, pendingMap) => {
  const next = new Set(normalizeFavoritesIds(baseIds));

  Object.values(normalizePendingMap(pendingMap)).forEach((operation) => {
    if (!operation?.questionId) return;
    if (operation.added) {
      next.add(operation.questionId);
    } else {
      next.delete(operation.questionId);
    }
  });

  return Array.from(next);
};

const isMissingFavoritesTableError = (error) =>
  !!error
  && error.code === "PGRST205"
  && typeof error.message === "string"
  && error.message.includes(`public.${USER_FAVORITES_TABLE}`);

const maybeLogMissingTable = () => {
  if (hasLoggedMissingFavoritesTable) return;
  hasLoggedMissingFavoritesTable = true;
  console.warn(
    `Supabase table '${USER_FAVORITES_TABLE}' is not available. Favorites will continue using local storage until the table is created.`
  );
};

const fetchRemoteFavoriteIds = async (userId) => {
  const { data, error } = await supabase
    .from(USER_FAVORITES_TABLE)
    .select("question_id")
    .eq("user_id", userId);

  if (isMissingFavoritesTableError(error)) {
    maybeLogMissingTable();
    return [];
  }
  if (error) throw error;

  return Array.isArray(data)
    ? data.map((row) => row.question_id).filter(Boolean)
    : [];
};

const addRemoteFavorite = async (questionId, userId) => {
  const { error } = await supabase
    .from(USER_FAVORITES_TABLE)
    .upsert(
      {
        user_id: userId,
        question_id: questionId,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,question_id" }
    );

  if (isMissingFavoritesTableError(error)) {
    maybeLogMissingTable();
    return;
  }
  if (error) throw error;
};

const removeRemoteFavorite = async (questionId, userId) => {
  const { error } = await supabase
    .from(USER_FAVORITES_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("question_id", questionId);

  if (isMissingFavoritesTableError(error)) {
    maybeLogMissingTable();
    return;
  }
  if (error) throw error;
};

const migrateLegacyFavoritesToUser = async (userId) => {
  if (!userId) return;

  const legacyIds = await readFavoritesCache();
  if (!legacyIds.length) return;

  const userIds = await readFavoritesCache(userId);
  const mergedIds = Array.from(new Set([...legacyIds, ...userIds]));
  await writeFavoritesCache(mergedIds, userId);

  const pending = await readPendingMap(userId);
  let didChangePending = false;

  legacyIds.forEach((questionId) => {
    if (pending[questionId]) return;
    pending[questionId] = {
      questionId,
      added: true,
      updatedAt: new Date().toISOString(),
    };
    didChangePending = true;
  });

  if (didChangePending) {
    await writePendingMap(pending, userId);
  }

  await removeValue(FAVORITES_KEY);
};

export const favoritesModel = {
  async getCachedAll(userId = null) {
    if (!userId) return [];

    const cachedIds = await readFavoritesCache(userId);
    const pendingMap = await readPendingMap(userId);
    return applyPendingToFavoriteIds(cachedIds, pendingMap);
  },

  async getAll(userId = null) {
    if (!userId) return [];
    if (!supabase) return readFavoritesCache(userId);

    await migrateLegacyFavoritesToUser(userId);

    const cachedIds = await readFavoritesCache(userId);
    const pendingMap = await readPendingMap(userId);

    try {
      let remoteIds = await fetchRemoteFavoriteIds(userId);

      if (Object.keys(pendingMap).length && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        await this.flushPending(userId);
        remoteIds = await fetchRemoteFavoriteIds(userId);
      }

      const latestPendingMap = await readPendingMap(userId);
      const mergedIds = applyPendingToFavoriteIds(remoteIds, latestPendingMap);
      await writeFavoritesCache(mergedIds, userId);
      return mergedIds;
    } catch (error) {
      if (!isMissingFavoritesTableError(error)) {
        console.error("Failed to load favorites from Supabase:", error);
      }
      return applyPendingToFavoriteIds(cachedIds, pendingMap);
    }
  },

  async add(questionId, userId = null) {
    if (!questionId || !userId) return;

    const ids = await readFavoritesCache(userId);
    if (!ids.includes(questionId)) {
      ids.push(questionId);
      await writeFavoritesCache(ids, userId);
    }

    if (!supabase) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const pending = await readPendingMap(userId);
      if (!pending[questionId]) {
        await enqueuePendingOperation(questionId, { added: true }, userId);
      }
      return;
    }

    try {
      await addRemoteFavorite(questionId, userId);
      await dequeuePendingOperation(questionId, userId);
    } catch (error) {
      console.error("Failed to add favorite to Supabase:", error);
      const pending = await readPendingMap(userId);
      if (!pending[questionId]) {
        await enqueuePendingOperation(questionId, { added: true }, userId);
      }
    }
  },

  async remove(questionId, userId = null) {
    if (!questionId || !userId) return;

    const ids = await readFavoritesCache(userId);
    const wasCached = ids.includes(questionId);
    if (wasCached) {
      await writeFavoritesCache(ids.filter((id) => id !== questionId), userId);
    }

    if (!supabase) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const pending = await readPendingMap(userId);
      if (!pending[questionId]) {
        await enqueuePendingOperation(questionId, { added: false }, userId);
      }
      return;
    }

    try {
      await removeRemoteFavorite(questionId, userId);
      await dequeuePendingOperation(questionId, userId);
    } catch (error) {
      console.error("Failed to remove favorite from Supabase:", error);
      const pending = await readPendingMap(userId);
      if (!pending[questionId]) {
        await enqueuePendingOperation(questionId, { added: false }, userId);
      }
    }
  },

  async set(questionId, isFavorite, userId = null) {
    if (isFavorite) {
      await this.add(questionId, userId);
    } else {
      await this.remove(questionId, userId);
    }
  },

  async flushPending(userId) {
    if (!userId || !supabase) return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;

    const pending = Object.values(await readPendingMap(userId)).sort((a, b) =>
      String(a?.updatedAt || "").localeCompare(String(b?.updatedAt || ""))
    );

    if (!pending.length) return false;

    const failed = {};
    let syncedAny = false;

    for (const operation of pending) {
      try {
        if (operation.added) {
          await addRemoteFavorite(operation.questionId, userId);
        } else {
          await removeRemoteFavorite(operation.questionId, userId);
        }
        syncedAny = true;
      } catch (error) {
        console.error("Failed to sync pending favorite:", error);
        failed[operation.questionId] = operation;
      }
    }

    await writePendingMap(failed, userId);
    return syncedAny;
  },
};
