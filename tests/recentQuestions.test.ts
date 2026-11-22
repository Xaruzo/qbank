import { describe, it, expect, beforeEach } from "vitest";
import {
  MAX_RECENT_QUESTIONS,
  clearRecentQuestions,
  formatRecentRelativeTime,
  readRecentQuestions,
  recordRecentQuestionCheck,
  recordRecentQuestionOpen,
  removeRecentQuestion,
  resolveRecentQuestions,
} from "../src/models/recentQuestionsModel";
import type { Question, QuestionMasteryRecord } from "../src/types";

const createMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, val: string) => {
      store.set(key, String(val));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
};

const makeQuestion = (id: string, topic: Question["topic"] = "numerical"): Question => ({
  id,
  topic,
  label: `Label ${id}`,
  question: `Question text ${id}`,
  choices: ["A", "B", "C", "D"],
  correct: 0,
});

describe("recentQuestionsModel", () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createMemoryStorage();
  });

  it("records opens and checks in most-recent-first order with deduplication", () => {
    const t1 = new Date(2026, 4, 15, 10, 0, 0);
    const t2 = new Date(2026, 4, 15, 10, 1, 0);
    const t3 = new Date(2026, 4, 15, 10, 2, 0);
    const t4 = new Date(2026, 4, 15, 10, 3, 0);

    recordRecentQuestionOpen("q1", "u1", t1);
    recordRecentQuestionOpen("q2", "u1", t2);
    recordRecentQuestionCheck("q1", true, "u1", t3);
    recordRecentQuestionCheck("q2", false, "u1", t4);

    const list = readRecentQuestions("u1");
    expect(list.map((e) => e.id)).toEqual(["q2", "q1"]);
    expect(list[0]).toMatchObject({ id: "q2", action: "checked", result: "wrong" });
    expect(list[1]).toMatchObject({ id: "q1", action: "checked", result: "correct" });
  });

  it("caps stored entries at MAX_RECENT_QUESTIONS and isolates per user", () => {
    const base = new Date(2026, 4, 15, 10, 0, 0);
    for (let i = 1; i <= MAX_RECENT_QUESTIONS + 4; i += 1) {
      recordRecentQuestionOpen(`q${i}`, "user-a", new Date(base.getTime() + i * 5000));
    }
    recordRecentQuestionOpen("q99", "user-b", base);

    const userAList = readRecentQuestions("user-a");
    const userBList = readRecentQuestions("user-b");

    expect(userAList).toHaveLength(MAX_RECENT_QUESTIONS);
    expect(userAList[0].id).toBe(`q${MAX_RECENT_QUESTIONS + 4}`);
    expect(userAList.some((e) => e.id === "q1")).toBe(false);
    expect(userBList.map((e) => e.id)).toEqual(["q99"]);
  });

  it("resolves live questions, drops deleted IDs, falls back to masteryMap, and supports removal/clear", () => {
    const t1 = new Date(2026, 4, 15, 10, 0, 0);
    const t2 = new Date(2026, 4, 15, 10, 5, 0);
    const t3 = new Date(2026, 4, 15, 10, 10, 0);

    recordRecentQuestionOpen("q1", "u2", t1);
    recordRecentQuestionOpen("deleted-q", "u2", t2);
    recordRecentQuestionCheck("q2", false, "u2", t3);

    const questions = [makeQuestion("q1", "verbal"), makeQuestion("q2", "numerical")];
    const masteryMap: Record<string, QuestionMasteryRecord> = {
      q1: {
        attempts: 1,
        correctCount: 1,
        wrongCount: 0,
        lastResult: "correct",
        lastAnsweredAt: t1.toISOString(),
      },
    };

    const resolved = resolveRecentQuestions(readRecentQuestions("u2"), questions, masteryMap, 5);
    expect(resolved.map((r) => r.question.id)).toEqual(["q2", "q1"]);
    expect(resolved[0]).toMatchObject({
      action: "checked",
      result: "wrong",
      topicShort: "NUM",
    });
    expect(resolved[1]).toMatchObject({
      action: "opened",
      result: "correct",
      topicShort: "VRB",
    });

    removeRecentQuestion("q2", "u2");
    expect(readRecentQuestions("u2").map((e) => e.id)).toEqual(["deleted-q", "q1"]);

    clearRecentQuestions("u2");
    expect(readRecentQuestions("u2")).toEqual([]);
  });

  it("formats relative timestamps cleanly", () => {
    const now = new Date(2026, 4, 15, 12, 0, 0);
    expect(formatRecentRelativeTime(new Date(now.getTime() - 15_000).toISOString(), now)).toBe("Just now");
    expect(formatRecentRelativeTime(new Date(now.getTime() - 7 * 60_000).toISOString(), now)).toBe("7m ago");
    expect(formatRecentRelativeTime(new Date(now.getTime() - 3 * 3_600_000).toISOString(), now)).toBe("3h ago");
    expect(formatRecentRelativeTime(new Date(now.getTime() - 26 * 3_600_000).toISOString(), now)).toBe("Yesterday");
  });
});
