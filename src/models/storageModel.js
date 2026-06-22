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
    } catch (e) {
      console.warn(`window.storage.set failed for key ${key}:`, e);
    }
  }
  localStorage.setItem(key, value);
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

    localStorage.setItem(key, value);
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
    localStorage.setItem(key, value);
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
    localStorage.setItem(key, value);
  },

  async listPendingUpserts() {
    const map = await this.getPendingUpsertsMap();
    return Object.values(map || {});
  },

  async enqueuePendingUpsert(q) {
    const map = await this.getPendingUpsertsMap();
    map[q.id] = q;
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
    localStorage.setItem(key, value);
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
    localStorage.setItem(key, value);
  },

  async get(key) {
    // 1. Try Supabase for shared global pool (Questions only)
    if (supabase && key === "cse-qbank-v1") {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          // Map database snake_case back to camelCase for the app
          const mappedData = data.map(q => ({
            ...q,
            solutionDraw: q.solution_draw, // Map back
            dateAdded: q.created_at
          }));

          let local = [];
          try {
            local = JSON.parse(localStorage.getItem(key) || "[]");
          } catch {
            local = [];
          }

          const pendingMap = await this.getPendingUpsertsMap();
          const pendingIds = new Set(Object.keys(pendingMap || {}));
          const syncedOnceIds = new Set(await this.getSyncedOnceIds());

          const parseTime = (v) => {
            const t = Date.parse(v || "");
            return Number.isFinite(t) ? t : 0;
          };

          const merged = new Map();
          const remoteIds = new Set();
          for (const q of mappedData) {
            merged.set(q.id, q);
            remoteIds.add(q.id);
          }

          const remoteDeleted = [];
          for (const id of syncedOnceIds) {
            if (!remoteIds.has(id)) remoteDeleted.push(id);
          }
          await this.setRemoteDeletedIds(remoteDeleted);

          for (const q of local) {
            if (!q || !q.id) continue;
            if (pendingIds.has(q.id)) {
              if (!remoteIds.has(q.id) && syncedOnceIds.has(q.id)) {
                await this.dequeuePendingUpsert(q.id);
                continue;
              }
              merged.set(q.id, q);
              continue;
            }

            if (!remoteIds.has(q.id)) continue;

            const remote = merged.get(q.id);
            if (remote && parseTime(q.dateAdded) > parseTime(remote.dateAdded)) merged.set(q.id, q);
          }

          return JSON.stringify(Array.from(merged.values()));
        }
        console.error("Supabase fetch error:", error);
      } catch (e) {
        console.warn("Supabase get failed:", e);
      }
    }

    // 2. Try window.storage (Custom environment)
    if (window.storage && typeof window.storage.get === 'function') {
      try {
        const result = await window.storage.get(key);
        return result.value;
      } catch (e) {
        console.warn(`window.storage.get failed for key ${key}:`, e);
      }
    }

    // 3. Fallback to localStorage
    return localStorage.getItem(key);
  },

  /**
   * Syncs a specific question to Supabase
   */
  async syncQuestion(q) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('questions')
        .upsert({
          id: q.id,
          topic: q.topic,
          question: q.question,
          choices: q.choices,
          correct: q.correct,
          solution: q.solution,
          solution_draw: q.solutionDraw, // Correct column name
          created_at: q.dateAdded
        });
      
      if (error) throw error;
      await this.markSyncedOnce(q.id);
    } catch (e) {
      console.error("Supabase sync failed:", e);
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
    localStorage.setItem(key, value);
  },

  async delete(id) {
    if (supabase) {
      try {
        const { error } = await supabase.from('questions').delete().eq('id', id);
        if (error) console.error("Supabase delete error:", error);
      } catch (e) {
        console.warn("Supabase delete failed:", e);
      }
    }
  }
};
