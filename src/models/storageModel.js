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
const MOCK_EXAM_ATTEMPTS_TABLE = "mock_exam_attempts";
const MOCK_EXAM_HISTORY_LIMIT = 12;

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
  questions: Array.isArray(attempt.questions) ? attempt.questions : [],
});

export const storageModel = {
  async getMockExamHistory(userId = null) {
    console.log('[storageModel] getMockExamHistory called with userId:', userId);
    const key = userId ? `${MOCK_EXAM_HISTORY_KEY}:${userId}` : MOCK_EXAM_HISTORY_KEY;
    console.log('[storageModel] Using key:', key);

    if (supabase && userId) {
      console.log('[storageModel] Loading from Supabase...');
      try {
        const { data, error } = await supabase
          .from(MOCK_EXAM_ATTEMPTS_TABLE)
          .select('id, completed_at, score_percent, correct_count, wrong_count, unanswered_count, total_count, time_spent_ms, topic_stats, questions')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(MOCK_EXAM_HISTORY_LIMIT);

        console.log('[storageModel] Supabase response:', { data, error });

        if (error) throw error;

        const remoteHistory = Array.isArray(data) ? data.map(normalizeMockExamAttempt) : [];
        console.log('[storageModel] Normalized remote history:', remoteHistory);
        if (remoteHistory.length) {
          await writeMockHistoryCache(key, remoteHistory);
          return remoteHistory;
        }
      } catch (e) {
        console.error("[storageModel] Failed to load mock exam history from Supabase:", e);
      }
    } else {
      console.log('[storageModel] Supabase not available or userId missing:', { supabase: !!supabase, userId });
    }

    // Check user-specific local cache first
    console.log('[storageModel] Checking user-specific local cache...');
    let parsed = await readMockHistoryCache(key);
    console.log('[storageModel] User-specific local cache:', parsed);
    if (Array.isArray(parsed) && parsed.length) {
      if (supabase && userId) await this.setMockExamHistory(parsed, userId);
      return parsed;
    }

    // If no user-specific, check legacy key
    if (userId) {
      console.log('[storageModel] Checking legacy cache...');
      const legacyKey = MOCK_EXAM_HISTORY_KEY;
      const legacy = await readMockHistoryCache(legacyKey);
      console.log('[storageModel] Legacy cache:', legacy);

      if (Array.isArray(legacy) && legacy.length) {
        await writeMockHistoryCache(key, legacy); // Save to user-specific key
        if (supabase) await this.setMockExamHistory(legacy, userId); // Sync to Supabase
        return legacy;
      }
    }

    console.log('[storageModel] No history found, returning empty array');
    return [];
  },

  async setMockExamHistory(history, userId = null) {
    console.log('[storageModel] setMockExamHistory called with:', { history, userId });
    const key = userId ? `${MOCK_EXAM_HISTORY_KEY}:${userId}` : MOCK_EXAM_HISTORY_KEY;
    const nextHistory = Array.isArray(history) ? history.slice(0, MOCK_EXAM_HISTORY_LIMIT) : [];
    console.log('[storageModel] Next history to save:', nextHistory);

    if (supabase && userId) {
      console.log('[storageModel] Saving to Supabase...');
      try {
        const rows = nextHistory.map((attempt) => serializeMockExamAttempt(attempt, userId));
        console.log('[storageModel] Serialized rows for Supabase:', rows);
        if (rows.length) {
          const { data, error } = await supabase
            .from(MOCK_EXAM_ATTEMPTS_TABLE)
            .upsert(rows, { onConflict: 'id' });
          console.log('[storageModel] Supabase upsert response:', { data, error });
          if (error) throw error;
        }
      } catch (e) {
        console.error("[storageModel] Failed to save mock exam history to Supabase:", e);
      }
    } else {
      console.log('[storageModel] Supabase not available or userId missing, not saving to remote');
    }

    console.log('[storageModel] Saving to local cache with key:', key);
    await writeMockHistoryCache(key, nextHistory);
    if (userId) {
      console.log('[storageModel] Removing legacy history from localStorage');
      localStorage.removeItem(MOCK_EXAM_HISTORY_KEY);
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
        
        if (!error) {
          // Map database snake_case back to camelCase for the app
          const mappedData = data ? data.map(q => ({
            ...q,
            solutionDraw: q.solution_draw, // Map back
            dateAdded: q.created_at
          })) : [];

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

            if (!remoteIds.has(q.id)) {
              // If we have local questions that aren't in remote, add them to merged
              merged.set(q.id, q);
              continue;
            }

            const remote = merged.get(q.id);
            if (remote && parseTime(q.dateAdded) > parseTime(remote.dateAdded)) merged.set(q.id, q);
          }

          const finalArray = Array.from(merged.values());
          // Only return empty if both remote and local are empty!
          if (finalArray.length === 0 && local.length === 0) {
            // Don't return anything, let it fall back to window.storage or localStorage
          } else {
            return JSON.stringify(finalArray);
          }
        } else {
          console.error("Supabase fetch error:", error);
        }
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
