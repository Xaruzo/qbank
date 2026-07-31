/**
 * Model for data persistence.
 * Handles communication with storage.
 * Priority: Supabase (Shared) > window.storage (Environment) > localStorage (Local)
 */
import { supabase } from '../utils/supabaseClient';
import { FAVORITES_KEY, MOCK_EXAM_HISTORY_KEY } from '../constants/appConstants';

const PENDING_UPSERTS_KEY = "cse-qbank-pending-upserts-v1";
const SYNCED_ONCE_KEY = "cse-qbank-synced-once-v1";
const REMOTE_DELETED_KEY = "cse-qbank-remote-deleted-v1";
const MOCK_EXAM_PENDING_KEY = "cse-mock-exam-pending-v1";
const ACTIVE_MOCK_EXAM_KEY = "cse-active-mock-exam-v1";
const MOCK_EXAM_ATTEMPTS_TABLE = "mock_exam_attempts";
const MOCK_EXAM_HISTORY_LIMIT = 12;

const parseTime = (value) => {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? t : 0;
};

const getQuestionUpdatedTime = (questionLike) => (
  parseTime(
    questionLike?.updatedAt
    || questionLike?.updated_at
    || questionLike?.deletedAt
    || questionLike?.deleted_at
    || questionLike?.dateAdded
    || questionLike?.created_at
    || ""
  )
);

const isQuestionDeleted = (questionLike) => !!(
  questionLike?.deletedAt
  || questionLike?.deleted_at
);

const normalizePendingQuestionOperation = (entry, fallbackId = null) => {
  if (!entry) return null;

  if (entry.type === "delete" && (entry.id || fallbackId)) {
    return {
      id: entry.id || fallbackId,
      type: "delete",
      deletedAt: entry.deletedAt || entry.updatedAt || null,
      updatedAt: entry.updatedAt || entry.deletedAt || null,
    };
  }

  if (entry.type === "upsert" && entry.question?.id) {
    return {
      id: entry.question.id,
      type: "upsert",
      question: entry.question,
    };
  }

  if (entry.id) {
    return {
      id: entry.id,
      type: "upsert",
      question: entry,
    };
  }

  return null;
};

const sortMockExamHistory = (history) => (
  [...history].sort((a, b) => {
    const timeDiff = parseTime(b?.completedAt) - parseTime(a?.completedAt);
    if (timeDiff !== 0) return timeDiff;
    return String(b?.id || "").localeCompare(String(a?.id || ""));
  })
);

const mergeMockExamAttempt = (base, incoming) => {
  if (!base) return incoming;
  if (!incoming) return base;

  const questions = Array.isArray(incoming.questions) && incoming.questions.length
    ? incoming.questions
    : Array.isArray(base.questions) ? base.questions : [];
  const topicStats = Array.isArray(incoming.topicStats) && incoming.topicStats.length
    ? incoming.topicStats
    : Array.isArray(base.topicStats) ? base.topicStats : [];

  return {
    ...base,
    ...incoming,
    questions,
    topicStats,
  };
};

const mergeMockExamHistory = (...sources) => {
  const merged = new Map();

  sources.forEach((source) => {
    if (!Array.isArray(source)) return;
    source.forEach((attempt) => {
      if (!attempt?.id) return;
      const existing = merged.get(attempt.id);
      merged.set(attempt.id, mergeMockExamAttempt(existing, attempt));
    });
  });

  return sortMockExamHistory(Array.from(merged.values())).slice(0, MOCK_EXAM_HISTORY_LIMIT);
};

const getMockExamPendingKey = (userId) => `${MOCK_EXAM_PENDING_KEY}:${userId}`;
const getActiveMockExamKey = (userId) => `${ACTIVE_MOCK_EXAM_KEY}:${userId}`;

const readMockHistoryCache = async (key) => {
  if (window.storage && typeof window.storage.get === 'function') {
    try {
      const result = await window.storage.get(key);
      return JSON.parse(result?.value || "[]");
    } catch (e) {
      console.warn(`window.storage.get failed for key ${key}:`, e);
    }
  }
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const writeMockHistoryCache = async (key, history) => {
  const value = JSON.stringify(history);
  if (window.storage && typeof window.storage.set === 'function') {
    try {
      await window.storage.set(key, value);
      return;
    } catch (_) {}
  }
  try { localStorage.setItem(key, value); } catch (_) {}
};

const normalizeMockExamAttempt = (row) => {
  const topicStats = Array.isArray(row?.topic_stats) ? row.topic_stats : [];
  const questions = Array.isArray(row?.questions) ? row.questions : [];
  const correctCount = row?.correct_count ?? 0;
  const wrongCount = row?.wrong_count ?? 0;
  const unansweredCount = row?.unanswered_count ?? Math.max(0, (row?.total_count ?? questions.length) - correctCount - wrongCount);
  const timeSpentMs = row?.time_spent_ms ?? 0;
  const completedAt = row?.completed_at || new Date().toISOString();
  const startedAt = new Date(completedAt).getTime() - timeSpentMs;

  return {
    id: row?.id,
    sessionId: row?.id || null,
    mode: "professional",
    startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
    completedAt,
    durationMs: timeSpentMs,
    timeSpentMs,
    timeLeftMs: 0,
    totalCount: row?.total_count ?? questions.length,
    answeredCount: correctCount + wrongCount,
    reviewCount: 0,
    correctCount,
    wrongCount,
    unansweredCount,
    scorePercent: row?.score_percent ?? 0,
    topicStats,
    strongestTopic: topicStats[0] || null,
    weakestTopic: topicStats.length > 1 ? topicStats[topicStats.length - 1] : topicStats[0] || null,
    questions,
  };
};

const serializeMockExamAttempt = (attempt, userId) => ({
  id: attempt.id,
  user_id: userId,
  completed_at: attempt.completedAt || new Date().toISOString(),
  score_percent: attempt.scorePercent ?? 0,
  correct_count: attempt.correctCount ?? 0,
  wrong_count: attempt.wrongCount ?? 0,
  unanswered_count: attempt.unansweredCount ?? 0,
  total_count: attempt.totalCount ?? 0,
  time_spent_ms: attempt.timeSpentMs ?? 0,
  topic_stats: Array.isArray(attempt.topicStats) ? attempt.topicStats : [],
  questions: Array.isArray(attempt.questions)
    ? attempt.questions.map((question, index) => ({
        index: Number.isInteger(question?.index) ? question.index : index,
        id: question?.id || null,
        topic: question?.topic || "other",
        correct: Number.isInteger(question?.correct) ? question.correct : null,
        userAnswer: question?.userAnswer ?? null,
        isCorrect: !!question?.isCorrect,
        wasAnswered: !!question?.wasAnswered,
      }))
    : [],
});

const fetchRemoteMockExamHistory = async (userId) => {
  const { data, error } = await supabase
    .from(MOCK_EXAM_ATTEMPTS_TABLE)
    .select('id, completed_at, score_percent, correct_count, wrong_count, unanswered_count, total_count, time_spent_ms, topic_stats, questions')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(MOCK_EXAM_HISTORY_LIMIT);

  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeMockExamAttempt) : [];
};

const readLocalValue = async (key) => {
  if (window.storage && typeof window.storage.get === 'function') {
    try {
      const result = await window.storage.get(key);
      return result?.value ?? null;
    } catch (e) {
      console.warn(`window.storage.get failed for key ${key}:`, e);
    }
  }

  return localStorage.getItem(key);
};

const fetchFreshQuestionsValue = async (storageApi) => {
  const questionsKey = "cse-qbank-v1";
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!data) return null;

  const mappedData = data.map(q => ({
    ...q,
    label: typeof q.label === "string" ? q.label : "",
    solutionDraw: q.solution_draw,
    dateAdded: q.created_at,
    updatedAt: q.updated_at || q.deleted_at || q.created_at,
    deletedAt: q.deleted_at || null,
  }));
  const visibleRemoteData = mappedData.filter(q => !q.deletedAt);

  let local = [];
  try {
    local = JSON.parse((await readLocalValue(questionsKey)) || "[]");
  } catch {
    local = [];
  }

  const pendingMap = await storageApi.getPendingUpsertsMap();
  const pendingOperations = Object.fromEntries(
    Object.entries(pendingMap || {})
      .map(([id, entry]) => [id, normalizePendingQuestionOperation(entry, id)])
      .filter(([, entry]) => !!entry)
  );
  const syncedOnceIds = new Set(await storageApi.getSyncedOnceIds());

  const merged = new Map();
  const remoteIds = new Set();
  const remoteRecords = new Map(mappedData.map(q => [q.id, q]));
  const remoteAllIds = new Set(remoteRecords.keys());
  const remoteDeleted = new Set(
    mappedData
      .filter(q => !!q.deletedAt)
      .map(q => q.id)
  );

  for (const q of visibleRemoteData) {
    merged.set(q.id, q);
    remoteIds.add(q.id);
  }

  for (const id of syncedOnceIds) {
    if (!remoteAllIds.has(id)) remoteDeleted.add(id);
  }
  for (const op of Object.values(pendingOperations)) {
    if (op?.type === "delete") merged.delete(op.id);
  }
  await storageApi.setRemoteDeletedIds(Array.from(remoteDeleted));

  for (const q of local) {
    if (!q || !q.id) continue;

    const pendingOp = pendingOperations[q.id];
    const remoteRecord = remoteRecords.get(q.id) || null;
    const remoteUpdatedTime = getQuestionUpdatedTime(remoteRecord);
    const localUpdatedTime = getQuestionUpdatedTime(q);
    const pendingUpdatedTime = getQuestionUpdatedTime(
      pendingOp?.type === "upsert" ? pendingOp.question : pendingOp
    );

    if (pendingOp?.type === "delete") {
      if (remoteDeleted.has(q.id)) {
        await storageApi.dequeuePendingUpsert(q.id);
        continue;
      }
      if (remoteRecord && remoteUpdatedTime > pendingUpdatedTime) {
        await storageApi.dequeuePendingUpsert(q.id);
        if (!remoteRecord.deletedAt) merged.set(q.id, remoteRecord);
      }
      continue;
    }

    if (pendingOp?.type === "upsert") {
      if (remoteDeleted.has(q.id) || isQuestionDeleted(remoteRecord)) {
        await storageApi.dequeuePendingUpsert(q.id);
        continue;
      }
      if (remoteRecord && remoteUpdatedTime > pendingUpdatedTime) {
        await storageApi.dequeuePendingUpsert(q.id);
        continue;
      }
      merged.set(q.id, pendingOp.question || q);
      continue;
    }

    if (remoteDeleted.has(q.id)) {
      try {
        await storageApi.dequeuePendingUpsert(q.id);
      } catch {}
      continue;
    }

    if (!remoteIds.has(q.id)) {
      if (syncedOnceIds.has(q.id)) continue;
      merged.set(q.id, q);
      await storageApi.enqueuePendingUpsert(q);
      continue;
    }

    const remote = merged.get(q.id);
    if (remote && localUpdatedTime > getQuestionUpdatedTime(remote)) {
      merged.set(q.id, q);
      await storageApi.enqueuePendingUpsert(q);
    }
  }

  return JSON.stringify(Array.from(merged.values()));
};

export const storageModel = {
  async getActiveMockExam(userId) {
    if (!userId) return null;
    const key = getActiveMockExamKey(userId);

    if (window.storage && typeof window.storage.get === 'function') {
      try {
        const result = await window.storage.get(key);
        return JSON.parse(result?.value || "null");
      } catch (e) {
        console.warn(`window.storage.get failed for key ${key}:`, e);
      }
    }

    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  },

  async setActiveMockExam(exam, userId) {
    if (!userId) return;
    const key = getActiveMockExamKey(userId);
    const value = JSON.stringify(exam || null);

    if (window.storage && typeof window.storage.set === 'function') {
      try {
        await window.storage.set(key, value);
        return;
      } catch (e) {
        console.warn(`window.storage.set failed for key ${key}:`, e);
      }
    }

    try { localStorage.setItem(key, value); } catch (_) {}
  },

  async clearActiveMockExam(userId) {
    if (!userId) return;
    const key = getActiveMockExamKey(userId);

    if (window.storage && typeof window.storage.set === 'function') {
      try {
        await window.storage.set(key, "null");
        localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn(`window.storage.set failed for key ${key}:`, e);
      }
    }

    localStorage.removeItem(key);
  },

  async getPendingMockExamAttempts(userId) {
    if (!userId) return [];
    return readMockHistoryCache(getMockExamPendingKey(userId));
  },

  async setPendingMockExamAttempts(history, userId) {
    if (!userId) return;
    await writeMockHistoryCache(getMockExamPendingKey(userId), mergeMockExamHistory(history));
  },

  async enqueuePendingMockExamAttempts(history, userId) {
    if (!userId) return;
    const current = await this.getPendingMockExamAttempts(userId);
    await this.setPendingMockExamAttempts(mergeMockExamHistory(current, history), userId);
  },

  async dequeuePendingMockExamAttempt(id, userId) {
    if (!userId || !id) return;
    const current = await this.getPendingMockExamAttempts(userId);
    await this.setPendingMockExamAttempts(current.filter((attempt) => attempt?.id !== id), userId);
  },

  async syncMockExamAttempt(attempt, userId) {
    if (!supabase || !userId || !attempt?.id) return;
    const { error } = await supabase
      .from(MOCK_EXAM_ATTEMPTS_TABLE)
      .upsert(serializeMockExamAttempt(attempt, userId), { onConflict: 'id' });
    if (error) throw error;
  },

  async flushPendingMockExamAttempts(userId) {
    if (!supabase || !userId) return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;

    const pending = await this.getPendingMockExamAttempts(userId);
    if (!pending.length) return false;

    const failed = [];
    let syncedAny = false;

    for (const attempt of pending) {
      try {
        await this.syncMockExamAttempt(attempt, userId);
        syncedAny = true;
      } catch (e) {
        console.error("Failed to sync pending mock exam attempt:", e);
        failed.push(attempt);
      }
    }

    await this.setPendingMockExamAttempts(failed, userId);
    return syncedAny;
  },

  async getMockExamHistory(userId = null) {
    if (!userId) return [];

    const key = userId ? `${MOCK_EXAM_HISTORY_KEY}:${userId}` : MOCK_EXAM_HISTORY_KEY;
    const cachedHistory = await readMockHistoryCache(key);
    const pendingHistory = await this.getPendingMockExamAttempts(userId);

    if (supabase) {
      try {
        let remoteHistory = await fetchRemoteMockExamHistory(userId);
        const remoteIds = new Set(remoteHistory.map((attempt) => attempt.id));
        const missingLocalHistory = cachedHistory.filter((attempt) => attempt?.id && !remoteIds.has(attempt.id));

        if (missingLocalHistory.length) {
          await this.enqueuePendingMockExamAttempts(missingLocalHistory, userId);
        }

        const shouldFlushPending = missingLocalHistory.length > 0 || pendingHistory.length > 0;
        if (shouldFlushPending && typeof navigator !== "undefined" && navigator.onLine !== false) {
          const syncedAny = await this.flushPendingMockExamAttempts(userId);
          if (syncedAny) remoteHistory = await fetchRemoteMockExamHistory(userId);
        }

        const latestPendingHistory = await this.getPendingMockExamAttempts(userId);
        const mergedHistory = mergeMockExamHistory(remoteHistory, cachedHistory, latestPendingHistory);
        await writeMockHistoryCache(key, mergedHistory);
        localStorage.removeItem(MOCK_EXAM_HISTORY_KEY);
        return mergedHistory;
      } catch (e) {
        console.error("Failed to load mock exam history from Supabase:", e);
      }
    }

    const parsed = mergeMockExamHistory(cachedHistory, pendingHistory);
    if (parsed.length) return parsed;

    const legacyKey = MOCK_EXAM_HISTORY_KEY;
    const legacy = await readMockHistoryCache(legacyKey);

    if (Array.isArray(legacy) && legacy.length) {
      const migratedHistory = mergeMockExamHistory(parsed, legacy);
      await writeMockHistoryCache(key, migratedHistory);
      await this.enqueuePendingMockExamAttempts(legacy, userId);
      localStorage.removeItem(legacyKey);
      return migratedHistory;
    }

    return [];
  },

  async setMockExamHistory(history, userId = null) {
    const key = userId ? `${MOCK_EXAM_HISTORY_KEY}:${userId}` : MOCK_EXAM_HISTORY_KEY;
    const nextHistory = mergeMockExamHistory(history);

    await writeMockHistoryCache(key, nextHistory);
    if (!userId) return;

    await this.enqueuePendingMockExamAttempts(nextHistory, userId);
    localStorage.removeItem(MOCK_EXAM_HISTORY_KEY);

    if (!supabase) return;

    try {
      await this.flushPendingMockExamAttempts(userId);
    } catch (e) {
      console.error("Failed to save mock exam history to Supabase:", e);
    }
  },

  async getFavoriteIds() {
    const key = FAVORITES_KEY;
    if (window.storage && typeof window.storage.get === 'function') {
      try {
        const result = await window.storage.get(key);
        return JSON.parse(result?.value || "[]");
      } catch (e) {
        console.warn(`window.storage.get failed for key ${key}:`, e);
      }
    }
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  },

  async setFavoriteIds(ids) {
    const key = FAVORITES_KEY;
    const value = JSON.stringify(ids);
    if (window.storage && typeof window.storage.set === 'function') {
      try {
        await window.storage.set(key, value);
        return;
      } catch (e) {
        console.warn(`window.storage.set failed for key ${key}:`, e);
      }
    }
    try { localStorage.setItem(key, value); } catch (_) {}
  },

  async getPendingUpsertsMap() {
    const key = PENDING_UPSERTS_KEY;
    if (window.storage && typeof window.storage.get === 'function') {
      try {
        const result = await window.storage.get(key);
        const value = result?.value || "{}";
        return JSON.parse(value);
      } catch (e) {
        console.warn(`window.storage.get failed for key ${key}:`, e);
      }
    }
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  },

  async setPendingUpsertsMap(map) {
    const key = PENDING_UPSERTS_KEY;
    const value = JSON.stringify(map);
    if (window.storage && typeof window.storage.set === 'function') {
      try {
        await window.storage.set(key, value);
        return;
      } catch (e) {
        console.warn(`window.storage.set failed for key ${key}:`, e);
      }
    }
    try { localStorage.setItem(key, value); } catch (_) {}
  },

  async listPendingUpserts() {
    const map = await this.getPendingUpsertsMap();
    return Object.entries(map || {})
      .map(([id, entry]) => normalizePendingQuestionOperation(entry, id))
      .filter(Boolean);
  },

  async enqueuePendingUpsert(q) {
    if (!q?.id) return;
    const map = await this.getPendingUpsertsMap();
    map[q.id] = {
      id: q.id,
      type: "upsert",
      question: q,
    };
    await this.setPendingUpsertsMap(map);
  },

  async enqueuePendingDelete(id) {
    if (!id) return;
    const deletedAt = new Date().toISOString();
    const map = await this.getPendingUpsertsMap();
    map[id] = {
      id,
      type: "delete",
      deletedAt,
      updatedAt: deletedAt,
    };
    await this.setPendingUpsertsMap(map);
  },

  async dequeuePendingUpsert(id) {
    const map = await this.getPendingUpsertsMap();
    if (map && map[id]) {
      delete map[id];
      await this.setPendingUpsertsMap(map);
    }
  },

  async getSyncedOnceIds() {
    const key = SYNCED_ONCE_KEY;
    if (window.storage && typeof window.storage.get === 'function') {
      try {
        const result = await window.storage.get(key);
        return JSON.parse(result?.value || "[]");
      } catch (e) {
        console.warn(`window.storage.get failed for key ${key}:`, e);
      }
    }
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  },

  async setSyncedOnceIds(ids) {
    const key = SYNCED_ONCE_KEY;
    const value = JSON.stringify(ids);
    if (window.storage && typeof window.storage.set === 'function') {
      try {
        await window.storage.set(key, value);
        return;
      } catch (e) {
        console.warn(`window.storage.set failed for key ${key}:`, e);
      }
    }
    try { localStorage.setItem(key, value); } catch (_) {}
  },

  async markSyncedOnce(id) {
    if (!id) return;
    const ids = await this.getSyncedOnceIds();
    if (ids.includes(id)) return;
    await this.setSyncedOnceIds([...ids, id]);
  },

  async getRemoteDeletedIds() {
    const key = REMOTE_DELETED_KEY;
    if (window.storage && typeof window.storage.get === 'function') {
      try {
        const result = await window.storage.get(key);
        return JSON.parse(result?.value || "[]");
      } catch (e) {
        console.warn(`window.storage.get failed for key ${key}:`, e);
      }
    }
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  },

  async setRemoteDeletedIds(ids) {
    const key = REMOTE_DELETED_KEY;
    const value = JSON.stringify(ids);
    if (window.storage && typeof window.storage.set === 'function') {
      try {
        await window.storage.set(key, value);
        return;
      } catch (e) {
        console.warn(`window.storage.set failed for key ${key}:`, e);
      }
    }
    try { localStorage.setItem(key, value); } catch (_) {}
  },

  async markRemoteDeleted(id) {
    if (!id) return;
    const ids = new Set(await this.getRemoteDeletedIds());
    ids.add(id);
    await this.setRemoteDeletedIds(Array.from(ids));
  },

  async clearRemoteDeleted(id) {
    if (!id) return;
    const ids = new Set(await this.getRemoteDeletedIds());
    if (!ids.delete(id)) return;
    await this.setRemoteDeletedIds(Array.from(ids));
  },

  async getLocal(key) {
    return readLocalValue(key);
  },

  async getFreshQuestions() {
    if (!supabase) return this.getLocal("cse-qbank-v1");
    return fetchFreshQuestionsValue(this);
  },

  async get(key) {
    // 1. Try Supabase for shared global pool (Questions only)
    if (supabase && key === "cse-qbank-v1") {
      try {
        return await fetchFreshQuestionsValue(this);
      } catch (e) {
        console.warn("Supabase get failed:", e);
      }
    }

    // 2. Try window.storage (Custom environment)
    return readLocalValue(key);
  },

  /**
   * Syncs a specific question to Supabase
   */
  async syncQuestion(q) {
    if (!supabase) return;
    const updatedAt = q.updatedAt || new Date().toISOString();
    try {
      const { data: existingRow, error: existingError } = await supabase
        .from('questions')
        .select('id, updated_at, deleted_at')
        .eq('id', q.id)
        .maybeSingle();

      if (existingError) throw existingError;

      const remoteUpdatedTime = getQuestionUpdatedTime(existingRow);
      const localUpdatedTime = getQuestionUpdatedTime({ ...q, updatedAt });

      if (isQuestionDeleted(existingRow)) {
        await this.markSyncedOnce(q.id);
        await this.markRemoteDeleted(q.id);
        await this.dequeuePendingUpsert(q.id);
        return { status: "remote_deleted" };
      }

      if (existingRow && remoteUpdatedTime > localUpdatedTime) {
        await this.markSyncedOnce(q.id);
        return { status: "stale_remote" };
      }

      const { error } = await supabase
        .from('questions')
        .upsert({
          id: q.id,
          topic: q.topic,
          label: typeof q.label === "string" ? q.label : "",
          question: q.question,
          choices: q.choices,
          correct: q.correct,
          solution: q.solution,
          solution_draw: q.solutionDraw, // Correct column name
          created_at: q.dateAdded,
          updated_at: updatedAt,
          deleted_at: null,
        }, { onConflict: 'id' });
      
      if (error) throw error;
      await this.markSyncedOnce(q.id);
      await this.clearRemoteDeleted(q.id);
      return { status: "synced" };
    } catch (e) {
      console.error("Supabase sync failed:", e);
      throw e;
    }
  },

  async syncQuestionDelete(id, deletedAt = new Date().toISOString()) {
    if (!supabase || !id) return;
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .eq('id', id);
      if (error) throw error;
      await this.markSyncedOnce(id);
      await this.markRemoteDeleted(id);
    } catch (e) {
      console.error("Supabase soft delete failed:", e);
      throw e;
    }
  },

  async set(key, value) {
    // We handle remote sync individually via syncQuestion now to be more robust,
    // but we still save locally as a backup.
    if (window.storage && typeof window.storage.set === 'function') {
      try {
        await window.storage.set(key, value);
        return;
      } catch (e) {
        console.warn(`window.storage.set failed for key ${key}:`, e);
      }
    }
    try { localStorage.setItem(key, value); } catch (_) {}
  },

  async delete(id) {
    console.log("Deleting question with id:", id);
    await this.dequeuePendingUpsert(id);

    if (supabase) {
      try {
        console.log("Attempting to soft delete from Supabase...");
        await this.syncQuestionDelete(id);
        console.log("✅ Question soft deleted from Supabase successfully!");
      } catch (e) {
        console.warn("Supabase soft delete failed, queueing pending delete:", e);
        await this.enqueuePendingDelete(id);
      }
    }
  }
};
