import { FAVORITES_KEY } from "../constants/appConstants";
import { supabase, isNetworkOrFetchError } from "../utils/supabaseClient";

const FAVORITES_CACHE_KEY = "cse-qbank-favorites-cache-v1";
const FAVORITES_PENDING_KEY = "cse-qbank-favorites-pending-v1";
const USER_FAVORITES_TABLE = "user_favorites";
let hasLoggedMissingFavoritesTable = false;

const safeParse = (raw: any, fallback: any) => {
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

const normalizePendingMap = (value: any): Record<string, any> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value).reduce((acc, [questionId, opData]) => {
    if (!questionId || !opData || typeof opData !== "object") return acc;
    const op = opData as any;
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
  try { localStorage.setItem(key, value); } catch {}
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

const readPendingMap = async (userId): Promise<Record<string, any>> => {
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

const isRlsOrPermissionError = (error: any) => {
  if (!error) return false;
  const code = String(error.code || "").toUpperCase();
  const msg = (error.message || error.details || (typeof error === "string" ? error : "") || "").toLowerCase();
  return (
    code === "42501" ||
    code === "PGRST301" ||
    error.status === 401 ||
    error.status === 403 ||
    msg.includes("row-level security") ||
    msg.includes("violates row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("insufficient_privilege")
  );
};

let hasLoggedRlsNotice = false;
const maybeLogRlsNotice = () => {
  if (hasLoggedRlsNotice) return;
  hasLoggedRlsNotice = true;
  console.warn(
    `Supabase table '${USER_FAVORITES_TABLE}' row-level security policy prevented remote sync. Using persistent local storage fallback.`
  );
};

const isSupabaseSessionActiveForUser = async (userId: string | null): Promise<boolean> => {
  if (!supabase || !userId) return false;
  try {
    const { data } = await supabase.auth.getSession();
    return !!data?.session?.user?.id && data.session.user.id === userId;
  } catch {
    return false;
  }
};

const maybeLogMissingTable = () => {
  if (hasLoggedMissingFavoritesTable) return;
  hasLoggedMissingFavoritesTable = true;
  console.warn(
    `Supabase table '${USER_FAVORITES_TABLE}' is not available. Favorites will continue using local storage until the table is created.`
  );
};

const fetchRemoteFavoriteIds = async (userId) => {
  const isSessionActive = await isSupabaseSessionActiveForUser(userId);
  if (!isSessionActive) {
    return [];
  }

  const { data, error } = await supabase
    .from(USER_FAVORITES_TABLE)
    .select("question_id")
    .eq("user_id", userId);

  if (isMissingFavoritesTableError(error)) {
    maybeLogMissingTable();
    return [];
  }
  if (isRlsOrPermissionError(error)) {
    maybeLogRlsNotice();
    return [];
  }
  if (error) throw error;

  return Array.isArray(data)
    ? data.map((row) => row.question_id).filter(Boolean)
    : [];
};

const addRemoteFavorite = async (questionId, userId) => {
  const isSessionActive = await isSupabaseSessionActiveForUser(userId);
  if (!isSessionActive) {
    return;
  }

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
  if (isRlsOrPermissionError(error)) {
    maybeLogRlsNotice();
    return;
  }
  if (error) throw error;
};

const removeRemoteFavorite = async (questionId, userId) => {
  const isSessionActive = await isSupabaseSessionActiveForUser(userId);
  if (!isSessionActive) {
    return;
  }

  const { error } = await supabase
    .from(USER_FAVORITES_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("question_id", questionId);

  if (isMissingFavoritesTableError(error)) {
    maybeLogMissingTable();
    return;
  }
  if (isRlsOrPermissionError(error)) {
    maybeLogRlsNotice();
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
      if (!isMissingFavoritesTableError(error) && !isRlsOrPermissionError(error)) {
        if (isNetworkOrFetchError(error)) {
          console.warn("Supabase favorites network offline/unreachable:", error.message || error);
        } else {
          console.warn("Could not load favorites from Supabase:", error);
        }
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
      if (isRlsOrPermissionError(error)) {
        maybeLogRlsNotice();
        await dequeuePendingOperation(questionId, userId);
      } else if (isNetworkOrFetchError(error)) {
        console.warn("Network offline, favorite queued locally:", error.message || error);
        const pending = await readPendingMap(userId);
        if (!pending[questionId]) {
          await enqueuePendingOperation(questionId, { added: true }, userId);
        }
      } else {
        console.warn("Could not sync favorite to Supabase:", error);
        const pending = await readPendingMap(userId);
        if (!pending[questionId]) {
          await enqueuePendingOperation(questionId, { added: true }, userId);
        }
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
      if (isRlsOrPermissionError(error)) {
        maybeLogRlsNotice();
        await dequeuePendingOperation(questionId, userId);
      } else if (isNetworkOrFetchError(error)) {
        console.warn("Network offline, favorite removal queued locally:", error.message || error);
        const pending = await readPendingMap(userId);
        if (!pending[questionId]) {
          await enqueuePendingOperation(questionId, { added: false }, userId);
        }
      } else {
        console.warn("Could not sync favorite removal to Supabase:", error);
        const pending = await readPendingMap(userId);
        if (!pending[questionId]) {
          await enqueuePendingOperation(questionId, { added: false }, userId);
        }
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

    const isSessionActive = await isSupabaseSessionActiveForUser(userId);
    if (!isSessionActive) {
      // Local/system account without an active Supabase session: purge stale pending queue
      await writePendingMap({}, userId);
      return false;
    }

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
        if (isRlsOrPermissionError(error)) {
          maybeLogRlsNotice();
          // Discard from failed so it doesn't get stuck in an endless retry loop
        } else if (isNetworkOrFetchError(error)) {
          console.warn("Network offline, pending favorite sync deferred:", error.message || error);
          failed[operation.questionId] = operation;
        } else {
          console.warn("Could not sync pending favorite to Supabase:", error);
          failed[operation.questionId] = operation;
        }
      }
    }

    await writePendingMap(failed, userId);
    return syncedAny;
  },
};
