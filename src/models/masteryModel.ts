import type { Question, QuestionMasteryRecord } from "../types";

export const MASTERY_STORAGE_KEY = "cse-qbank-mastery-v1";
export const DAILY_COUNT_STORAGE_KEY = "cse-qbank-daily-v1";
export const MASTERY_UPDATED_EVENT = "qbank-mastery-updated";

const getScope = (userId?: string | null) => (userId && userId.trim() ? userId.trim() : "local");
const getMasteryKey = (userId?: string | null) => `${MASTERY_STORAGE_KEY}:${getScope(userId)}`;
const getDailyKey = (userId?: string | null) => `${DAILY_COUNT_STORAGE_KEY}:${getScope(userId)}`;

const safeGetItem = (key: string): string | null => {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or restricted-environment errors
  }
};

const emitMasteryUpdated = (userId?: string | null) => {
  try {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent(MASTERY_UPDATED_EVENT, { detail: { userId: userId || null } }));
  } catch {
    // Ignore environments without CustomEvent
  }
};

export const getLocalDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const readMasteryMap = (userId?: string | null): Record<string, QuestionMasteryRecord> => {
  const raw = safeGetItem(getMasteryKey(userId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, QuestionMasteryRecord>;
  } catch {
    return {};
  }
};

const writeMasteryMap = (map: Record<string, QuestionMasteryRecord>, userId?: string | null): void => {
  safeSetItem(getMasteryKey(userId), JSON.stringify(map));
};

export const readDailyCountsMap = (userId?: string | null): Record<string, number> => {
  const raw = safeGetItem(getDailyKey(userId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
};

const pruneOldDailyCounts = (counts: Record<string, number>): Record<string, number> => {
  const entries = Object.entries(counts)
    .filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(v) && v >= 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 60);
  return Object.fromEntries(entries);
};

export const getTodayAnsweredCount = (userId?: string | null, now: Date = new Date()): number => {
  const counts = readDailyCountsMap(userId);
  const val = counts[getLocalDateKey(now)];
  return Number.isFinite(val) ? Math.max(0, Number(val)) : 0;
};

export const recordQuestionOutcome = (
  questionId: string,
  isCorrect: boolean,
  userId?: string | null,
  now: Date = new Date()
): Record<string, QuestionMasteryRecord> => {
  return recordBatchQuestionOutcomes([{ id: questionId, isCorrect }], userId, now);
};

export const recordBatchQuestionOutcomes = (
  outcomes: Array<{ id: string; isCorrect: boolean }>,
  userId?: string | null,
  now: Date = new Date()
): Record<string, QuestionMasteryRecord> => {
  const valid = (outcomes || []).filter((item) => item && typeof item.id === "string" && item.id.trim());
  const current = readMasteryMap(userId);
  if (valid.length === 0) return current;

  const isoNow = now.toISOString();
  const next: Record<string, QuestionMasteryRecord> = { ...current };

  for (const { id, isCorrect } of valid) {
    const existing = next[id];
    next[id] = {
      attempts: (existing?.attempts || 0) + 1,
      correctCount: (existing?.correctCount || 0) + (isCorrect ? 1 : 0),
      wrongCount: (existing?.wrongCount || 0) + (isCorrect ? 0 : 1),
      lastResult: isCorrect ? "correct" : "wrong",
      lastAnsweredAt: isoNow,
    };
  }

  writeMasteryMap(next, userId);

  const dateKey = getLocalDateKey(now);
  const daily = readDailyCountsMap(userId);
  const nextDaily = pruneOldDailyCounts({
    ...daily,
    [dateKey]: (Number(daily[dateKey]) || 0) + valid.length,
  });
  safeSetItem(getDailyKey(userId), JSON.stringify(nextDaily));

  emitMasteryUpdated(userId);
  return next;
};

export const getMasterySummary = (
  questions: Pick<Question, "id">[],
  masteryMap: Record<string, QuestionMasteryRecord> = {}
) => {
  let unseen = 0;
  let missed = 0;
  let mastered = 0;

  for (const q of questions || []) {
    const record = masteryMap?.[q.id];
    if (!record || !record.attempts) {
      unseen += 1;
    } else if (record.lastResult === "wrong") {
      missed += 1;
    } else {
      mastered += 1;
    }
  }

  return {
    all: (questions || []).length,
    unseen,
    missed,
    mastered,
    attempted: missed + mastered,
  };
};

export const getDaysUntilExam = (
  targetExamDate?: string | null,
  now: Date = new Date()
): number | null => {
  if (!targetExamDate || typeof targetExamDate !== "string") return null;
  const match = targetExamDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const targetYear = Number(match[1]);
  const targetMonth = Number(match[2]) - 1;
  const targetDay = Number(match[3]);
  const targetUtc = Date.UTC(targetYear, targetMonth, targetDay);
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (!Number.isFinite(targetUtc) || !Number.isFinite(todayUtc)) return null;

  return Math.round((targetUtc - todayUtc) / 86_400_000);
};
