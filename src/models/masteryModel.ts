import { TOPICS } from "../constants/appConstants";
import type { Question, QuestionMasteryRecord, TopicId } from "../types";

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

export interface StudyDayEntry {
  dateKey: string;
  dayLabel: string;
  isToday: boolean;
  count: number;
  goalMet: boolean;
  ratio: number;
}

export interface StudyStreakSummary {
  todayCount: number;
  currentStreak: number;
  bestStreak: number;
  goalMetToday: boolean;
  weeklyTotal: number;
  totalDaysActive: number;
  last7Days: StudyDayEntry[];
}

const shiftLocalDays = (base: Date, deltaDays: number): Date => {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + deltaDays);
  return d;
};

const parseLocalDateKey = (dateKey: string): Date | null => {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const getStudyStreakSummary = (
  userId?: string | null,
  dailyGoal: number = 25,
  now: Date = new Date()
): StudyStreakSummary => {
  const counts = readDailyCountsMap(userId);
  const safeGoal = Math.max(1, Number(dailyGoal) || 25);
  const todayKey = getLocalDateKey(now);
  const todayCount = Math.max(0, Number(counts[todayKey]) || 0);

  // Build 7-day rolling window ending today
  const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const last7Days: StudyDayEntry[] = [];
  let weeklyTotal = 0;

  for (let offset = -6; offset <= 0; offset += 1) {
    const dayDate = shiftLocalDays(now, offset);
    const key = getLocalDateKey(dayDate);
    const count = Math.max(0, Number(counts[key]) || 0);
    weeklyTotal += count;
    last7Days.push({
      dateKey: key,
      dayLabel: offset === 0 ? "Today" : weekdayFmt.format(dayDate),
      isToday: offset === 0,
      count,
      goalMet: count >= safeGoal,
      ratio: Math.min(1, count / safeGoal),
    });
  }

  // Current consecutive streak: includes today if todayCount > 0, otherwise yesterday backwards
  let currentStreak = 0;
  const startOffset = todayCount > 0 ? 0 : -1;
  for (let offset = startOffset; offset >= -365; offset -= 1) {
    const key = getLocalDateKey(shiftLocalDays(now, offset));
    if ((Number(counts[key]) || 0) > 0) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  // Best streak and total active days across stored log
  const activeDates = Object.entries(counts)
    .filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number(v) > 0)
    .map(([k]) => k)
    .sort();

  let bestStreak = 0;
  let running = 0;
  let prevDate: Date | null = null;

  for (const key of activeDates) {
    const curDate = parseLocalDateKey(key);
    if (!curDate) continue;
    if (prevDate) {
      const diffDays = Math.round(
        (Date.UTC(curDate.getFullYear(), curDate.getMonth(), curDate.getDate()) -
          Date.UTC(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate())) /
          86_400_000
      );
      running = diffDays === 1 ? running + 1 : 1;
    } else {
      running = 1;
    }
    if (running > bestStreak) bestStreak = running;
    prevDate = curDate;
  }

  return {
    todayCount,
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    goalMetToday: todayCount >= safeGoal,
    weeklyTotal,
    totalDaysActive: activeDates.length,
    last7Days,
  };
};

export interface SubjectMasteryRow {
  id: TopicId;
  label: string;
  short: string;
  color: string;
  total: number;
  mastered: number;
  missed: number;
  unseen: number;
  attempted: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracyPercent: number | null;
  masteryPercent: number;
  needsAttention: boolean;
}

const CORE_SUBJECT_IDS: TopicId[] = ["numerical", "verbal", "general", "analytical", "clerical"];

export const getSubjectMasteryBreakdown = (
  questions: Pick<Question, "id" | "topic">[] = [],
  masteryMap: Record<string, QuestionMasteryRecord> = {}
): { subjects: SubjectMasteryRow[]; weakAreas: SubjectMasteryRow[] } => {
  const subjects: SubjectMasteryRow[] = CORE_SUBJECT_IDS.map((topicId) => {
    const topicMeta = TOPICS.find((t) => t.id === topicId);
    const topicQs = (questions || []).filter((q) => q.topic === topicId);

    let mastered = 0;
    let missed = 0;
    let unseen = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;

    for (const q of topicQs) {
      const rec = masteryMap?.[q.id];
      if (!rec || !rec.attempts) {
        unseen += 1;
      } else {
        correctAnswers += Number(rec.correctCount) || 0;
        wrongAnswers += Number(rec.wrongCount) || 0;
        if (rec.lastResult === "wrong") missed += 1;
        else mastered += 1;
      }
    }

    const total = topicQs.length;
    const attempted = mastered + missed;
    const totalOutcomeCount = correctAnswers + wrongAnswers;
    const accuracyPercent =
      totalOutcomeCount > 0 ? Math.round((correctAnswers / totalOutcomeCount) * 100) : null;
    const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const needsAttention = missed > 0 || (accuracyPercent !== null && accuracyPercent < 80);

    return {
      id: topicId,
      label: topicMeta?.label || topicId,
      short: topicMeta?.short || topicId,
      color: topicMeta?.color || "#f5a623",
      total,
      mastered,
      missed,
      unseen,
      attempted,
      correctAnswers,
      wrongAnswers,
      accuracyPercent,
      masteryPercent,
      needsAttention,
    };
  });

  const weakAreas = subjects
    .filter((s) => s.needsAttention)
    .sort((a, b) => {
      if (b.missed !== a.missed) return b.missed - a.missed;
      const aAcc = a.accuracyPercent ?? 100;
      const bAcc = b.accuracyPercent ?? 100;
      return aAcc - bAcc;
    });

  return { subjects, weakAreas };
};
