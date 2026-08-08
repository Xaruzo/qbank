import { TIPS_KEY } from "../constants/appConstants";
import { supabase } from "../utils/supabaseClient";

const TIPS_CACHE_KEY = "cse-qbank-tips-cache-v2";
const TIPS_PENDING_KEY = "cse-qbank-tips-pending-v2";
const QUESTION_TIPS_TABLE = "question_tips";
let remoteTipsTableAvailable = true;
let remoteTipsDisabledAt = 0;
let hasLoggedMissingTipsTable = false;
const REMOTE_TIPS_DISABLED_MS = 60 * 1000;

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
  LEARNING: { id: 'learning', label: 'Still Learning', icon: 'BookOpen', color: '#ef4444' },
  FAMILIAR: { id: 'familiar', label: 'Familiar', icon: 'BookMarked', color: '#f59e0b' },
  MASTERED: { id: 'mastered', label: 'Mastered', icon: 'CheckCircle2', color: '#10b981' },
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
        attachmentUrl: "",
        attachmentType: "",
        attachmentName: "",
        attachmentPath: "",
      };
    } else if (tipData && typeof tipData === "object") {
      const text = typeof tipData.text === "string" ? tipData.text : "";
      const attachmentUrl = typeof tipData.attachmentUrl === "string" ? tipData.attachmentUrl : "";
      if (!text.trim() && !tipData.canvasData && !attachmentUrl.trim()) return acc;
      acc[questionId] = {
        text,
        canvasData: tipData.canvasData || null,
        category: tipData.category || 'general',
        masteryLevel: tipData.masteryLevel || 'learning',
        lastReviewed: tipData.lastReviewed || null,
        attachmentUrl,
        attachmentType: typeof tipData.attachmentType === "string" ? tipData.attachmentType : "",
        attachmentName: typeof tipData.attachmentName === "string" ? tipData.attachmentName : "",
        attachmentPath: typeof tipData.attachmentPath === "string" ? tipData.attachmentPath : "",
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
    const attachmentUrl = typeof op.attachmentUrl === "string" ? op.attachmentUrl : "";
    if (!text.trim() && !op.canvasData && !attachmentUrl.trim()) return acc;
    
    acc[questionId] = {
      questionId,
      text,
      canvasData: op.canvasData || null,
      category: op.category || 'general',
      masteryLevel: op.masteryLevel || 'learning',
      lastReviewed: op.lastReviewed || null,
      attachmentUrl,
      attachmentType: typeof op.attachmentType === "string" ? op.attachmentType : "",
      attachmentName: typeof op.attachmentName === "string" ? op.attachmentName : "",
      attachmentPath: typeof op.attachmentPath === "string" ? op.attachmentPath : "",
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
      attachmentUrl: operation.attachmentUrl || "",
      attachmentType: operation.attachmentType || "",
      attachmentName: operation.attachmentName || "",
      attachmentPath: operation.attachmentPath || "",
    };
  });

  return next;
};

const mergeCachedAttachmentFields = (baseMap, cachedMap) => {
  const normalizedBase = normalizeTipsMap(baseMap);
  const normalizedCache = normalizeTipsMap(cachedMap);
  const questionIds = new Set([
    ...Object.keys(normalizedBase),
    ...Object.keys(normalizedCache),
  ]);

  return Array.from(questionIds).reduce((acc, questionId) => {
    const tipData = normalizedBase[questionId] || {};
    const cachedTip = normalizedCache[questionId];

    if (!cachedTip && !normalizedBase[questionId]) return acc;

    acc[questionId] = {
      ...cachedTip,
      ...tipData,
      attachmentUrl: tipData.attachmentUrl || cachedTip?.attachmentUrl || "",
      attachmentType: tipData.attachmentType || cachedTip?.attachmentType || "",
      attachmentName: tipData.attachmentName || cachedTip?.attachmentName || "",
      attachmentPath: tipData.attachmentPath || cachedTip?.attachmentPath || "",
    };
    return acc;
  }, {});
};

const isMissingQuestionTipsTableError = (error) =>
  !!error
  && error.code === "PGRST205"
  && typeof error.message === "string"
  && error.message.includes(`public.${QUESTION_TIPS_TABLE}`);

const isRemoteTipsEnabledNow = () =>
  remoteTipsTableAvailable || Date.now() >= remoteTipsDisabledAt + REMOTE_TIPS_DISABLED_MS;

const logRemoteTipError = (context, error) => {
  if (!error) return;
  const message = typeof error.message === "string" ? error.message : "";
  const isRlsBlocked =
    error.code === "42501"
    || /row-level security|permission denied|new row violates/i.test(message)
    || /pgrst301|pgrst204/i.test(error.code || "");
  if (isRlsBlocked) {
    console.error(
      `[${context}] Supabase rejected the request (row-level security). `
      + `The '${QUESTION_TIPS_TABLE}' table has no per-user policies yet - run 'supabase/setup-policies.sql' in the Supabase SQL editor. `
      + `The tip is kept pending and will sync automatically once policies exist.`
    );
  } else {
    console.error(`[${context}]`, error);
  }
};

const markRemoteTipsUnavailable = () => {
  remoteTipsTableAvailable = false;
  remoteTipsDisabledAt = Date.now();
  if (hasLoggedMissingTipsTable) return;
  hasLoggedMissingTipsTable = true;
  console.warn(
    `Supabase table '${QUESTION_TIPS_TABLE}' is not available. Tips will continue using local storage; retrying again in ${REMOTE_TIPS_DISABLED_MS / 1000}s.`
  );
};

const fetchRemoteTipsMap = async (userId) => {
  if (!isRemoteTipsEnabledNow()) return {};

  const { data, error } = await supabase
    .from(QUESTION_TIPS_TABLE)
    .select("id, question_id, tip_text, canvas_data, tip_category, mastery_level, last_reviewed, linked_question_id:question_id")
    .eq("user_id", userId);

  if (isMissingQuestionTipsTableError(error)) {
    markRemoteTipsUnavailable();
    return {};
  }
  if (error) throw error;

  remoteTipsTableAvailable = true;

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
          linkedQuestionId: row?.linked_question_id || null,
          attachmentUrl: "",
          attachmentType: "",
          attachmentName: "",
          attachmentPath: "",
        };
        return acc;
      }, {})
    : {};
};

const syncRemoteTip = async (questionId, tipData, userId) => {
  if (!isRemoteTipsEnabledNow()) return;

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

  remoteTipsTableAvailable = true;
};

const deleteRemoteTip = async (questionId, userId) => {
  if (!isRemoteTipsEnabledNow()) return;

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

  remoteTipsTableAvailable = true;
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
      const mergedRemoteMap = mergeCachedAttachmentFields(remoteMap, cachedMap);
      const mergedMap = applyPendingToTipsMap(mergedRemoteMap, latestPendingMap);
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
        attachmentUrl: "",
        attachmentType: "",
        attachmentName: "",
        attachmentPath: "",
      };
    } else if (tipData && typeof tipData === "object") {
      normalizedData = {
        text: typeof tipData.text === "string" ? tipData.text : "",
        canvasData: tipData.canvasData || null,
        category: tipData.category || 'general',
        masteryLevel: tipData.masteryLevel || 'learning',
        lastReviewed: tipData.lastReviewed || null,
        attachmentUrl: typeof tipData.attachmentUrl === "string" ? tipData.attachmentUrl : "",
        attachmentType: typeof tipData.attachmentType === "string" ? tipData.attachmentType : "",
        attachmentName: typeof tipData.attachmentName === "string" ? tipData.attachmentName : "",
        attachmentPath: typeof tipData.attachmentPath === "string" ? tipData.attachmentPath : "",
      };
    } else {
      normalizedData = {
        text: "",
        canvasData: null,
        category: 'general',
        masteryLevel: 'learning',
        lastReviewed: null,
        attachmentUrl: "",
        attachmentType: "",
        attachmentName: "",
        attachmentPath: "",
      };
    }

    const trimmedText = normalizedData.text.trim();
    const hasContent = trimmedText || normalizedData.canvasData || normalizedData.attachmentUrl.trim();

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
        logRemoteTipError("Failed to delete tip from Supabase", error);
      }

      return;
    }

    const existingData = map[questionId];
    const isSame = existingData 
      && existingData.text === normalizedData.text
      && JSON.stringify(existingData.canvasData) === JSON.stringify(normalizedData.canvasData)
      && existingData.category === normalizedData.category
      && existingData.masteryLevel === normalizedData.masteryLevel
      && (existingData.attachmentUrl || "") === normalizedData.attachmentUrl
      && (existingData.attachmentType || "") === normalizedData.attachmentType
      && (existingData.attachmentName || "") === normalizedData.attachmentName
      && (existingData.attachmentPath || "") === normalizedData.attachmentPath;
    
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
      logRemoteTipError("Failed to save tip to Supabase", error);
    }
  },

  async deleteTip(questionId, userId = null) {
    await this.setTip(questionId, { text: "", canvasData: null }, userId);
  },

  async getPendingCount(userId) {
    if (!userId) return 0;
    const pending = await readPendingMap(userId);
    return Object.keys(pending).length;
  },

  async flushPending(userId) {
    if (!userId || !supabase) return false;
    if (!isRemoteTipsEnabledNow()) return false;
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
            attachmentUrl: operation.attachmentUrl || "",
            attachmentType: operation.attachmentType || "",
            attachmentName: operation.attachmentName || "",
            attachmentPath: operation.attachmentPath || "",
          };
          await syncRemoteTip(operation.questionId, tipData, userId);
        }
        syncedAny = true;
      } catch (error) {
        logRemoteTipError("Failed to sync pending tip", error);
        failed[operation.questionId] = operation;
      }
    }

    await writePendingMap(failed, userId);
    return syncedAny;
  },

  // NEW: Get tips linked to a specific question
  async getTipsByQuestionId(questionId, userId = null) {
    if (!userId || !supabase || !remoteTipsTableAvailable) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from(QUESTION_TIPS_TABLE)
        .select("question_id, tip_text, canvas_data, tip_category, mastery_level, last_reviewed")
        .eq("user_id", userId)
        .eq("linked_question_id", questionId);

      if (isMissingQuestionTipsTableError(error)) {
        markRemoteTipsUnavailable();
        return [];
      }
      if (error) throw error;

      return Array.isArray(data)
        ? data.map(row => ({
            id: row.question_id,
            text: row.tip_text || "",
            canvasData: row.canvas_data || null,
            category: row.tip_category || 'general',
            masteryLevel: row.mastery_level || 'learning',
            lastReviewed: row.last_reviewed || null,
          }))
        : [];
    } catch (error) {
      console.error("Failed to fetch tips for question:", error);
      return [];
    }
  },
};
