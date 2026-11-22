import { TOPICS } from "../constants/appConstants";
import type { Question, QuestionMasteryRecord } from "../types";

export const RECENT_QUESTIONS_STORAGE_KEY = "cse-qbank-recent-questions-v1";
export const RECENT_QUESTIONS_UPDATED_EVENT = "qbank-recent-questions-updated";
export const MAX_RECENT_QUESTIONS = 10;

export type RecentQuestionAction = "opened" | "checked";
export type RecentQuestionResult = "correct" | "wrong";

export interface RecentQuestionEntry {
  id: string;
  openedAt: string;
  action: RecentQuestionAction;
  result?: RecentQuestionResult;
}

export interface ResolvedRecentQuestion {
  question: Question;
  openedAt: string;
  action: RecentQuestionAction;
  result: RecentQuestionResult | null;
  topicLabel: string;
  topicShort: string;
  topicColor: string;
}

const getScope = (userId?: string | null) =>
  userId && userId.trim() ? userId.trim() : "local";

export const getRecentQuestionsStorageKey = (userId?: string | null) =>
  `${RECENT_QUESTIONS_STORAGE_KEY}:${getScope(userId)}`;

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

const emitRecentQuestionsUpdated = (userId?: string | null) => {
  try {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(
      new CustomEvent(RECENT_QUESTIONS_UPDATED_EVENT, { detail: { userId: userId || null } })
    );
  } catch {
    // Ignore environments without CustomEvent
  }
};

const normalizeEntry = (raw: unknown): RecentQuestionEntry | null => {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  if (!id) return null;

  const openedAt =
    typeof candidate.openedAt === "string" && Number.isFinite(Date.parse(candidate.openedAt))
      ? candidate.openedAt
      : new Date().toISOString();

  const action: RecentQuestionAction =
    candidate.action === "checked" ? "checked" : "opened";

  const result: RecentQuestionResult | undefined =
    candidate.result === "correct" || candidate.result === "wrong"
      ? candidate.result
      : undefined;

  return result
    ? { id, openedAt, action, result }
    : { id, openedAt, action };
};

export const readRecentQuestions = (userId?: string | null): RecentQuestionEntry[] => {
  const raw = safeGetItem(getRecentQuestionsStorageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const normalized: RecentQuestionEntry[] = [];
    for (const item of parsed) {
      const entry = normalizeEntry(item);
      if (!entry || seen.has(entry.id)) continue;
      seen.add(entry.id);
      normalized.push(entry);
      if (normalized.length >= MAX_RECENT_QUESTIONS) break;
    }
    return normalized;
  } catch {
    return [];
  }
};

const writeRecentQuestions = (
  entries: RecentQuestionEntry[],
  userId?: string | null
): void => {
  safeSetItem(
    getRecentQuestionsStorageKey(userId),
    JSON.stringify(entries.slice(0, MAX_RECENT_QUESTIONS))
  );
  emitRecentQuestionsUpdated(userId);
};

export const recordRecentQuestionOpen = (
  questionId: string,
  userId?: string | null,
  now: Date = new Date()
): RecentQuestionEntry[] => {
  const cleanId = typeof questionId === "string" ? questionId.trim() : "";
  const current = readRecentQuestions(userId);
  if (!cleanId) return current;

  const existing = current.find((item) => item.id === cleanId);
  const isoNow = now.toISOString();
  const existingTime = existing ? Date.parse(existing.openedAt) : NaN;

  // Guard against rapid duplicate opens (e.g. React StrictMode double-invoke) wiping a just-checked status
  const isImmediateDuplicate =
    existing &&
    Number.isFinite(existingTime) &&
    Math.abs(now.getTime() - existingTime) < 1500 &&
    existing.action === "checked";

  const nextEntry: RecentQuestionEntry = isImmediateDuplicate
    ? { ...existing, openedAt: isoNow }
    : {
        id: cleanId,
        openedAt: isoNow,
        action: "opened",
        ...(existing?.result ? { result: existing.result } : {}),
      };

  const next = [nextEntry, ...current.filter((item) => item.id !== cleanId)].slice(
    0,
    MAX_RECENT_QUESTIONS
  );
  writeRecentQuestions(next, userId);
  return next;
};

export const recordRecentQuestionCheck = (
  questionId: string,
  isCorrect: boolean,
  userId?: string | null,
  now: Date = new Date()
): RecentQuestionEntry[] => {
  const cleanId = typeof questionId === "string" ? questionId.trim() : "";
  const current = readRecentQuestions(userId);
  if (!cleanId) return current;

  const nextEntry: RecentQuestionEntry = {
    id: cleanId,
    openedAt: now.toISOString(),
    action: "checked",
    result: isCorrect ? "correct" : "wrong",
  };

  const next = [nextEntry, ...current.filter((item) => item.id !== cleanId)].slice(
    0,
    MAX_RECENT_QUESTIONS
  );
  writeRecentQuestions(next, userId);
  return next;
};

export const removeRecentQuestion = (
  questionId: string,
  userId?: string | null
): RecentQuestionEntry[] => {
  const cleanId = typeof questionId === "string" ? questionId.trim() : "";
  const current = readRecentQuestions(userId);
  if (!cleanId) return current;
  const next = current.filter((item) => item.id !== cleanId);
  if (next.length === current.length) return current;
  writeRecentQuestions(next, userId);
  return next;
};

export const clearRecentQuestions = (userId?: string | null): RecentQuestionEntry[] => {
  writeRecentQuestions([], userId);
  return [];
};

export const resolveRecentQuestions = (
  entries: RecentQuestionEntry[],
  questions: Question[],
  masteryMap: Record<string, QuestionMasteryRecord> = {},
  limit: number = 6
): ResolvedRecentQuestion[] => {
  if (!Array.isArray(entries) || entries.length === 0 || !Array.isArray(questions) || questions.length === 0) {
    return [];
  }

  const qById = new Map<string, Question>();
  for (const q of questions) {
    if (q?.id) qById.set(q.id, q);
  }

  const resolved: ResolvedRecentQuestion[] = [];
  for (const entry of entries) {
    const question = qById.get(entry.id);
    if (!question) continue;

    const topicMeta = TOPICS.find((t) => t.id === question.topic) || TOPICS[0];
    const masteryResult = masteryMap?.[question.id]?.lastResult;
    const result: RecentQuestionResult | null =
      entry.result ?? (masteryResult === "correct" || masteryResult === "wrong" ? masteryResult : null);

    resolved.push({
      question,
      openedAt: entry.openedAt,
      action: entry.action,
      result,
      topicLabel: topicMeta?.label || "General",
      topicShort: topicMeta?.short || "GEN",
      topicColor: topicMeta?.color || "#f5a623",
    });

    if (resolved.length >= Math.max(1, limit)) break;
  }

  return resolved;
};

export const formatRecentRelativeTime = (
  isoString: string,
  now: Date = new Date()
): string => {
  const ts = Date.parse(isoString);
  if (!Number.isFinite(ts)) return "Recently";

  const diffMs = Math.max(0, now.getTime() - ts);
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};
