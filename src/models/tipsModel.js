import { TIPS_KEY } from "../constants/appConstants";
import { supabase } from "../utils/supabaseClient";

const TIPS_CACHE_KEY = "cse-qbank-tips-cache-v2";
const TIPS_PENDING_KEY = "cse-qbank-tips-pending-v2";
const QUESTION_TIPS_TABLE = "question_tips";
let remoteTipsTableAvailable = true;
let hasLoggedMissingTipsTable = false;

// Tip categories
export const TIP_CATEGORIES = {
  FORMULA: { id: 'formula', label: 'Formula', color: '#3b82f6' },
  SHORTCUT: { id: 'shortcut', label: 'Shortcut', color: '#8b5cf6' },
  METHOD: { id: 'method', label: 'Method', color: '#10b981' },
  TRICK: { id: 'trick', label: 'Trick', color: '#f59e0b' },
  EXAMPLE: { id: 'example', label: 'Example', color: '#06b6d4' },
  MNEMONIC: { id: 'mnemonic', label: 'Mnemonic', color: '#ec4899' },
  GENERAL: { id: 'general', label: 'General', color: '#6b7280' },
};

// Mastery levels
export const MASTERY_LEVELS = {
  LEARNING: { id: 'learning', label: 'Still Learning', icon: '📖', color: '#ef4444' },
  FAMILIAR: { id: 'familiar', label: 'Familiar', icon: '📝', color: '#f59e0b' },
  MASTERED: { id: 'mastered', label: 'Mastered', icon: '✅', color: '#10b981' },
};

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

  return Object.entries(value).reduce((acc, [questionId, tipData]) => {
    if (!questionId) return acc;
    
    // Support both legacy string format and new object format
    if (typeof tipData === "string") {
      if (!tipData.trim()) return acc;
      acc[questionId] = {
        text: tipData,
        canvasData: null,
        category: 'general',
        masteryLevel: 'learning',
        lastReviewed: null,
      };
    } else if (tipData && typeof tipData === "object") {
      const text = typeof tipData.text === "string" ? tipData.text : "";
      if (!text.trim() && !tipData.canvasData) return acc;
      acc[questionId] = {
        text,
        canvasData: tipData.canvasData || null,
        category: tipData.category || 'general',
        masteryLevel: tipData.masteryLevel || 'learning',
        lastReviewed: tipData.lastReviewed || null,
      };
    }
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

    const text = typeof op.text === "string" ? op.text : "";
    if (!text.trim() && !op.canvasData) return acc;
    
    acc[questionId] = {
      questionId,
      text,
      canvasData: op.canvasData || null,
      category: op.category || 'general',
      masteryLevel: op.masteryLevel || 'learning',
      lastReviewed: op.lastReviewed || null,
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
  try { localStorage.setItem(key, value); } catch (_) {}
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
    next[operation.questionId] = {
      text: operation.text || "",
      canvasData: operation.canvasData || null,
      category: operation.category || 'general',
      masteryLevel: operation.masteryLevel || 'learning',
      lastReviewed: operation.lastReviewed || null,
    };
  });

  return next;
};

const isMissingQuestionTipsTableError = (error) =>
  !!error
  && error.code === "PGRST205"
  && typeof error.message === "string"
  && error.message.includes(`public.${QUESTION_TIPS_TABLE}`);

const markRemoteTipsUnavailable = () => {
  remoteTipsTableAvailable = false;
  if (hasLoggedMissingTipsTable) return;
  hasLoggedMissingTipsTable = true;
  console.warn(
    `Supabase table '${QUESTION_TIPS_TABLE}' is not available. Tips will continue using local storage until the table is created.`
  );
};

const fetchRemoteTipsMap = async (userId) => {
  if (!remoteTipsTableAvailable) return {};

  const { data, error } = await supabase
    .from(QUESTION_TIPS_TABLE)
    .select("question_id, tip_text, canvas_data, tip_category, mastery_level, last_reviewed")
    .eq("user_id", userId);

  if (isMissingQuestionTipsTableError(error)) {
    markRemoteTipsUnavailable();
    return {};
  }
  if (error) throw error;

  return Array.isArray(data)
    ? data.reduce((acc, row) => {
        if (!row?.question_id) return acc;
        const text = typeof row?.tip_text === "string" ? row.tip_text : "";
        const canvasData = row?.canvas_data || null;
        if (!text.trim() && !canvasData) return acc;
        
        acc[row.question_id] = {
          text,
          canvasData,
          category: row?.tip_category || 'general',
          masteryLevel: row?.mastery_level || 'learning',
          lastReviewed: row?.last_reviewed || null,
        };
        return acc;
      }, {})
    : {};
};

const syncRemoteTip = async (questionId, tipData, userId) => {
  if (!remoteTipsTableAvailable) return;

  const { error } = await supabase
    .from(QUESTION_TIPS_TABLE)
    .upsert(
      {
        user_id: userId,
        question_id: questionId,
        tip_text: tipData.text || "",
        canvas_data: tipData.canvasData || null,
        tip_category: tipData.category || 'general',
        mastery_level: tipData.masteryLevel || 'learning',
        last_reviewed: tipData.lastReviewed || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,question_id" }
    );

  if (isMissingQuestionTipsTableError(error)) {
    markRemoteTipsUnavailable();
    return;
  }
  if (error) throw error;
};

const deleteRemoteTip = async (questionId, userId) => {
  if (!remoteTipsTableAvailable) return;

  const { error } = await supabase
    .from(QUESTION_TIPS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("question_id", questionId);

  if (isMissingQuestionTipsTableError(error)) {
    markRemoteTipsUnavailable();
    return;
  }
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
    const legacyValue = legacyTips[questionId];
    if (mergedTips[questionId] !== legacyValue) return;
    if (pending[questionId]) return;
    
    // Migrate legacy string format to new object format
    const tipData = typeof legacyValue === "string" 
      ? { text: legacyValue, canvasData: null, category: 'general', masteryLevel: 'learning', lastReviewed: null }
      : legacyValue;
    
    pending[questionId] = {
      questionId,
      ...tipData,
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
      if (isMissingQuestionTipsTableError(error)) {
        markRemoteTipsUnavailable();
      } else {
      console.error("Failed to load tips from Supabase:", error);
      }
      return applyPendingToTipsMap(cachedMap, pendingMap);
    }
  },

  async setTip(questionId, tipData, userId = null) {
    if (!questionId) return;

    const map = await readTipsCache(userId);
    
    // Support both legacy string format and new object format
    let normalizedData;
    if (typeof tipData === "string") {
      normalizedData = {
        text: tipData,
        canvasData: null,
        category: 'general',
        masteryLevel: 'learning',
        lastReviewed: null,
      };
    } else if (tipData && typeof tipData === "object") {
      normalizedData = {
        text: typeof tipData.text === "string" ? tipData.text : "",
        canvasData: tipData.canvasData || null,
        category: tipData.category || 'general',
        masteryLevel: tipData.masteryLevel || 'learning',
        lastReviewed: tipData.lastReviewed || null,
      };
    } else {
      normalizedData = {
        text: "",
        canvasData: null,
        category: 'general',
        masteryLevel: 'learning',
        lastReviewed: null,
      };
    }

    const trimmedText = normalizedData.text.trim();
    const hasContent = trimmedText || normalizedData.canvasData;

    if (!hasContent) {
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

    const existingData = map[questionId];
    const isSame = existingData 
      && existingData.text === normalizedData.text
      && JSON.stringify(existingData.canvasData) === JSON.stringify(normalizedData.canvasData)
      && existingData.category === normalizedData.category
      && existingData.masteryLevel === normalizedData.masteryLevel;
    
    if (isSame) return;
    
    map[questionId] = normalizedData;
    await writeTipsCache(map, userId);

    if (!userId || !supabase) return;

    await enqueuePendingOperation(questionId, { ...normalizedData, deleted: false }, userId);

    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    try {
      await syncRemoteTip(questionId, normalizedData, userId);
      await dequeuePendingOperation(questionId, userId);
    } catch (error) {
      console.error("Failed to save tip to Supabase:", error);
    }
  },

  async deleteTip(questionId, userId = null) {
    await this.setTip(questionId, { text: "", canvasData: null }, userId);
  },

  async flushPending(userId) {
    if (!userId || !supabase) return false;
    if (!remoteTipsTableAvailable) return false;
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
          const tipData = {
            text: operation.text || "",
            canvasData: operation.canvasData || null,
            category: operation.category || 'general',
            masteryLevel: operation.masteryLevel || 'learning',
            lastReviewed: operation.lastReviewed || null,
          };
          await syncRemoteTip(operation.questionId, tipData, userId);
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
