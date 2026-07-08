import { TIPS_KEY } from "../constants/appConstants";
import { supabase } from "../utils/supabaseClient";

const TIPS_CACHE_KEY = "cse-qbank-tips-cache-v1";
const TIPS_PENDING_KEY = "cse-qbank-tips-pending-v1";
const QUESTION_TIPS_TABLE = "question_tips";

const safeParse = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const normalizeTipsMap = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value).reduce((acc, [questionId, text]) => {
    if (!questionId || typeof text !== "string" || !text.trim()) return acc;
    acc[questionId] = text;
    return acc;
  }, {});
};

const normalizePendingMap = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value).reduce((acc, [questionId, op]) => {
    if (!questionId || !op || typeof op !== "object") return acc;

    if (op.deleted) {
      acc[questionId] = {
        questionId,
        deleted: true,
        updatedAt: typeof op.updatedAt === "string" ? op.updatedAt : new Date().toISOString(),
      };
      return acc;
    }

    if (typeof op.text !== "string" || !op.text.trim()) return acc;
    acc[questionId] = {
      questionId,
      text: op.text,
      deleted: false,
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
      await window.storage.set(key, "{}");
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
  localStorage.setItem(key, value);
};

const getTipsCacheKey = (userId) => (userId ? `${TIPS_CACHE_KEY}:${userId}` : TIPS_KEY);
const getPendingTipsKey = (userId) => (userId ? `${TIPS_PENDING_KEY}:${userId}` : null);

const readTipsCache = async (userId = null) => {
  const raw = await readValue(getTipsCacheKey(userId));
  return normalizeTipsMap(safeParse(raw || "{}", {}));
};

const writeTipsCache = async (map, userId = null) => {
  await writeValue(getTipsCacheKey(userId), JSON.stringify(normalizeTipsMap(map)));
};

const readPendingMap = async (userId) => {
  if (!userId) return {};
  const key = getPendingTipsKey(userId);
  const raw = await readValue(key);
  return normalizePendingMap(safeParse(raw || "{}", {}));
};

const writePendingMap = async (map, userId) => {
  if (!userId) return;
  const key = getPendingTipsKey(userId);
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

const applyPendingToTipsMap = (baseMap, pendingMap) => {
  const next = { ...normalizeTipsMap(baseMap) };

  Object.values(normalizePendingMap(pendingMap)).forEach((operation) => {
    if (!operation?.questionId) return;
    if (operation.deleted) {
      delete next[operation.questionId];
      return;
    }
    next[operation.questionId] = operation.text;
  });

  return next;
};

const fetchRemoteTipsMap = async (userId) => {
  const { data, error } = await supabase
    .from(QUESTION_TIPS_TABLE)
    .select("question_id, tip_text")
    .eq("user_id", userId);

  if (error) throw error;

  return Array.isArray(data)
    ? data.reduce((acc, row) => {
        if (row?.question_id && typeof row?.tip_text === "string" && row.tip_text.trim()) {
          acc[row.question_id] = row.tip_text;
        }
        return acc;
      }, {})
    : {};
};

const syncRemoteTip = async (questionId, text, userId) => {
  const { error } = await supabase
    .from(QUESTION_TIPS_TABLE)
    .upsert(
      {
        user_id: userId,
        question_id: questionId,
        tip_text: text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,question_id" }
    );

  if (error) throw error;
};

const deleteRemoteTip = async (questionId, userId) => {
  const { error } = await supabase
    .from(QUESTION_TIPS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("question_id", questionId);

  if (error) throw error;
};

const migrateLegacyTipsToUser = async (userId) => {
  if (!userId) return;

  const legacyTips = await readTipsCache();
  const legacyIds = Object.keys(legacyTips);
  if (!legacyIds.length) return;

  const userTips = await readTipsCache(userId);
  const mergedTips = { ...legacyTips, ...userTips };
  await writeTipsCache(mergedTips, userId);

  const pending = await readPendingMap(userId);
  let didChangePending = false;

  legacyIds.forEach((questionId) => {
    if (mergedTips[questionId] !== legacyTips[questionId]) return;
    if (pending[questionId]) return;
    pending[questionId] = {
      questionId,
      text: legacyTips[questionId],
      deleted: false,
      updatedAt: new Date().toISOString(),
    };
    didChangePending = true;
  });

  if (didChangePending) {
    await writePendingMap(pending, userId);
  }

  await removeValue(TIPS_KEY);
};

export const tipsModel = {
  async getAll(userId = null) {
    if (!userId || !supabase) {
      return readTipsCache(userId);
    }

    await migrateLegacyTipsToUser(userId);

    const cachedMap = await readTipsCache(userId);
    const pendingMap = await readPendingMap(userId);

    try {
      let remoteMap = await fetchRemoteTipsMap(userId);

      if (Object.keys(pendingMap).length && (typeof navigator === "undefined" || navigator.onLine !== false)) {
        await this.flushPending(userId);
        remoteMap = await fetchRemoteTipsMap(userId);
      }

      const latestPendingMap = await readPendingMap(userId);
      const mergedMap = applyPendingToTipsMap(remoteMap, latestPendingMap);
      await writeTipsCache(mergedMap, userId);
      return mergedMap;
    } catch (error) {
      console.error("Failed to load tips from Supabase:", error);
      return applyPendingToTipsMap(cachedMap, pendingMap);
    }
  },

  async setTip(questionId, text, userId = null) {
    if (!questionId) return;

    const map = await readTipsCache(userId);
    const normalized = typeof text === "string" ? text : "";
    const trimmed = normalized.trim();

    if (!trimmed) {
      if (map[questionId] !== undefined) {
        delete map[questionId];
        await writeTipsCache(map, userId);
      }

      if (!userId || !supabase) return;

      await enqueuePendingOperation(questionId, { deleted: true }, userId);

      if (typeof navigator !== "undefined" && navigator.onLine === false) return;

      try {
        await deleteRemoteTip(questionId, userId);
        await dequeuePendingOperation(questionId, userId);
      } catch (error) {
        console.error("Failed to delete tip from Supabase:", error);
      }

      return;
    }

    if (map[questionId] === normalized) return;
    map[questionId] = normalized;
    await writeTipsCache(map, userId);

    if (!userId || !supabase) return;

    await enqueuePendingOperation(questionId, { text: normalized, deleted: false }, userId);

    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    try {
      await syncRemoteTip(questionId, normalized, userId);
      await dequeuePendingOperation(questionId, userId);
    } catch (error) {
      console.error("Failed to save tip to Supabase:", error);
    }
  },

  async deleteTip(questionId, userId = null) {
    await this.setTip(questionId, "", userId);
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
        if (operation.deleted) {
          await deleteRemoteTip(operation.questionId, userId);
        } else {
          await syncRemoteTip(operation.questionId, operation.text, userId);
        }
        syncedAny = true;
      } catch (error) {
        console.error("Failed to sync pending tip:", error);
        failed[operation.questionId] = operation;
      }
    }

    await writePendingMap(failed, userId);
    return syncedAny;
  },
};
