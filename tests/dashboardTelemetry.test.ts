import { describe, it, expect, beforeEach } from "vitest";
import {
  DAILY_COUNT_STORAGE_KEY,
  getStudyStreakSummary,
  getSubjectMasteryBreakdown,
  recordBatchQuestionOutcomes,
  readMasteryMap,
} from "../src/models/masteryModel";
import type { Question } from "../src/types";

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

describe("dashboard telemetry (study streak & subject mastery)", () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createMemoryStorage();
  });

  it("computes active streak ending today, best streak, 7-day window, and daily goal completion", () => {
    const now = new Date(2026, 4, 15, 14, 0, 0); // May 15, 2026
    // Older 4-day streak (May 5..8) + current 3-day streak ending today (May 13..15)
    localStorage.setItem(
      `${DAILY_COUNT_STORAGE_KEY}:user-dash-1`,
      JSON.stringify({
        "2026-05-05": 10,
        "2026-05-06": 25,
        "2026-05-07": 30,
        "2026-05-08": 12,
        "2026-05-13": 15,
        "2026-05-14": 25,
        "2026-05-15": 28,
      })
    );

    const summary = getStudyStreakSummary("user-dash-1", 25, now);

    expect(summary.todayCount).toBe(28);
    expect(summary.goalMetToday).toBe(true);
    expect(summary.currentStreak).toBe(3);
    expect(summary.bestStreak).toBe(4);
    expect(summary.totalDaysActive).toBe(7);
    expect(summary.weeklyTotal).toBe(15 + 25 + 28);
    expect(summary.last7Days).toHaveLength(7);
    expect(summary.last7Days[6]).toMatchObject({
      dateKey: "2026-05-15",
      dayLabel: "Today",
      isToday: true,
      count: 28,
      goalMet: true,
      ratio: 1,
    });
  });

  it("keeps streak alive through yesterday when today has 0 answered items yet", () => {
    const now = new Date(2026, 4, 15, 9, 0, 0);
    localStorage.setItem(
      `${DAILY_COUNT_STORAGE_KEY}:user-dash-2`,
      JSON.stringify({
        "2026-05-13": 12,
        "2026-05-14": 20,
      })
    );

    const summary = getStudyStreakSummary("user-dash-2", 25, now);
    expect(summary.todayCount).toBe(0);
    expect(summary.goalMetToday).toBe(false);
    expect(summary.currentStreak).toBe(2);
    expect(summary.bestStreak).toBe(2);
  });

  it("breaks current streak when neither today nor yesterday has activity", () => {
    const now = new Date(2026, 4, 15, 9, 0, 0);
    localStorage.setItem(
      `${DAILY_COUNT_STORAGE_KEY}:user-dash-3`,
      JSON.stringify({
        "2026-05-10": 15,
        "2026-05-11": 22,
        "2026-05-12": 30,
      })
    );

    const summary = getStudyStreakSummary("user-dash-3", 25, now);
    expect(summary.currentStreak).toBe(0);
    expect(summary.bestStreak).toBe(3);
  });

  it("breaks down mastery by CSE subject and ranks weak areas by missed count then lowest accuracy", () => {
    const fixedDate = new Date(2026, 4, 15, 11, 0, 0);
    const questions: Pick<Question, "id" | "topic">[] = [
      { id: "n1", topic: "numerical" },
      { id: "n2", topic: "numerical" },
      { id: "n3", topic: "numerical" },
      { id: "v1", topic: "verbal" },
      { id: "v2", topic: "verbal" },
      { id: "g1", topic: "general" },
      { id: "a1", topic: "analytical" },
      { id: "c1", topic: "clerical" },
    ];

    recordBatchQuestionOutcomes(
      [
        // Numerical: n1 mastered, n2 missed, n3 missed -> 2 missed, 33% accuracy
        { id: "n1", isCorrect: true },
        { id: "n2", isCorrect: false },
        { id: "n3", isCorrect: false },
        // Verbal: v1 wrong then right (mastered, 50% accuracy < 80%), v2 mastered -> 0 missed, 67% acc
        { id: "v1", isCorrect: false },
        { id: "v1", isCorrect: true },
        { id: "v2", isCorrect: true },
        // General: 1/1 mastered (100%)
        { id: "g1", isCorrect: true },
        // Analytical: 1 missed (0% acc)
        { id: "a1", isCorrect: false },
        // Clerical: unseen
      ],
      "user-dash-4",
      fixedDate
    );

    const masteryMap = readMasteryMap("user-dash-4");
    const { subjects, weakAreas } = getSubjectMasteryBreakdown(questions, masteryMap);

    expect(subjects.map((s) => s.id)).toEqual([
      "numerical",
      "verbal",
      "general",
      "analytical",
      "clerical",
    ]);

    const numerical = subjects.find((s) => s.id === "numerical")!;
    expect(numerical.mastered).toBe(1);
    expect(numerical.missed).toBe(2);
    expect(numerical.unseen).toBe(0);
    expect(numerical.accuracyPercent).toBe(33);
    expect(numerical.masteryPercent).toBe(33);
    expect(numerical.needsAttention).toBe(true);

    const verbal = subjects.find((s) => s.id === "verbal")!;
    expect(verbal.mastered).toBe(2);
    expect(verbal.missed).toBe(0);
    expect(verbal.accuracyPercent).toBe(67);
    expect(verbal.needsAttention).toBe(true);

    const general = subjects.find((s) => s.id === "general")!;
    expect(general.accuracyPercent).toBe(100);
    expect(general.needsAttention).toBe(false);

    const clerical = subjects.find((s) => s.id === "clerical")!;
    expect(clerical.unseen).toBe(1);
    expect(clerical.accuracyPercent).toBeNull();
    expect(clerical.needsAttention).toBe(false);

    // Weak areas sorted by highest missed count first: numerical (2) -> analytical (1) -> verbal (0, 67% acc)
    expect(weakAreas.map((w) => w.id)).toEqual(["numerical", "analytical", "verbal"]);
  });
});
