import { describe, it, expect, beforeEach } from "vitest";
import {
  recordQuestionOutcome,
  recordBatchQuestionOutcomes,
  readMasteryMap,
  getTodayAnsweredCount,
  getMasterySummary,
  getDaysUntilExam,
} from "../src/models/masteryModel";
import {
  parseCsvRows,
  parseImportedQuestions,
} from "../src/utils/questionImportExport";
import {
  buildQuickPracticeExam,
  calculateExamMetrics,
} from "../src/utils/mockExamAnalytics";

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

describe("masteryModel", () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createMemoryStorage();
  });

  it("records individual and batch question outcomes and updates daily count", () => {
    const fixedDate = new Date(2026, 4, 10, 10, 0, 0);
    recordQuestionOutcome("q1", true, "user-1", fixedDate);
    recordQuestionOutcome("q1", false, "user-1", fixedDate);
    recordBatchQuestionOutcomes(
      [
        { id: "q2", isCorrect: true },
        { id: "q3", isCorrect: false },
      ],
      "user-1",
      fixedDate
    );

    const map = readMasteryMap("user-1");
    expect(map.q1.attempts).toBe(2);
    expect(map.q1.correctCount).toBe(1);
    expect(map.q1.wrongCount).toBe(1);
    expect(map.q1.lastResult).toBe("wrong");
    expect(map.q2.lastResult).toBe("correct");
    expect(map.q3.lastResult).toBe("wrong");
    expect(getTodayAnsweredCount("user-1", fixedDate)).toBe(4);
  });

  it("computes unseen/missed/mastered summary and exam countdown accurately", () => {
    const fixedDate = new Date(2026, 4, 10, 10, 0, 0);
    recordBatchQuestionOutcomes(
      [
        { id: "q1", isCorrect: true },
        { id: "q2", isCorrect: false },
      ],
      "user-2",
      fixedDate
    );
    const map = readMasteryMap("user-2");
    const summary = getMasterySummary([{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }], map);
    expect(summary).toEqual({
      all: 4,
      unseen: 2,
      missed: 1,
      mastered: 1,
      attempted: 2,
    });

    expect(getDaysUntilExam("2026-05-15", fixedDate)).toBe(5);
    expect(getDaysUntilExam("2026-05-10", fixedDate)).toBe(0);
    expect(getDaysUntilExam("invalid", fixedDate)).toBeNull();
  });
});

describe("questionImportExport", () => {
  it("parses RFC-4180 CSV rows including quoted commas and escaped quotes", () => {
    const csv = [
      'topic,label,question,choiceA,choiceB,choiceC,choiceD,correct,solution',
      'numerical,"Ratio, Basics","What is ""2:4"" simplified?",1:2,2:3,3:4,4:5,A,"Divide both by 2"',
    ].join("\n");

    const rows = parseCsvRows(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1][1]).toBe("Ratio, Basics");
    expect(rows[1][2]).toBe('What is "2:4" simplified?');
    expect(rows[1][7]).toBe("A");
  });

  it("validates JSON and CSV imports, handles letter/numeric answers, and skips duplicates", () => {
    const existing = [{ question: "What is the capital of the Philippines?" }];
    const jsonInput = JSON.stringify({
      questions: [
        {
          topic: "general",
          label: "Philippine Constitution",
          question: "What is the capital of the Philippines?",
          choices: ["Cebu", "Manila", "Davao", "Iloilo"],
          correct: 1,
        },
        {
          topic: "Numerical Ability",
          label: "Percent",
          question: "What is 25% of 80?",
          choices: ["10", "15", "20", "25"],
          correct: "C",
          solution: "0.25 * 80 = 20",
        },
        {
          topic: "unknown_topic",
          question: "Bad topic row",
          choices: ["A", "B", "C", "D"],
          correct: 0,
        },
      ],
    });

    const res = parseImportedQuestions(jsonInput, "bank.json", existing);
    expect(res.totalParsed).toBe(3);
    expect(res.duplicateCount).toBe(1);
    expect(res.valid).toHaveLength(1);
    expect(res.valid[0].topic).toBe("numerical");
    expect(res.valid[0].correct).toBe(2);
    expect(res.errors).toHaveLength(1);
  });
});

describe("Quick Practice and untimed exam metrics", () => {
  const sampleBank = [
    { id: "q1", topic: "numerical", choices: ["1", "2", "3", "4"], correct: 0 },
    { id: "q2", topic: "numerical", choices: ["1", "2", "3", "4"], correct: 1 },
    { id: "q3", topic: "verbal", choices: ["a", "b", "c", "d"], correct: 2 },
    { id: "q4", topic: "general", choices: ["a", "b", "c", "d"], correct: 3 },
  ];

  const masteryMap = {
    q1: { attempts: 1, lastResult: "correct" as const },
    q2: { attempts: 1, lastResult: "wrong" as const },
  };

  it("filters Quick Practice candidates by scope, topic, count, and timed option", () => {
    const missedRun = buildQuickPracticeExam({
      questions: sampleBank,
      masteryMap,
      scope: "missed",
      topic: "all",
      count: 10,
      timed: false,
    });
    expect(missedRun.mode).toBe("quick");
    expect(missedRun.timed).toBe(false);
    expect(missedRun.durationMs).toBe(0);
    expect(missedRun.orderIds).toEqual(["q2"]);

    const unseenRun = buildQuickPracticeExam({
      questions: sampleBank,
      masteryMap,
      scope: "unseen",
      topic: "verbal",
      count: 10,
      timed: true,
    });
    expect(unseenRun.timed).toBe(true);
    expect(unseenRun.durationMs).toBe(60_000);
    expect(unseenRun.orderIds).toEqual(["q3"]);
  });

  it("calculates elapsed time correctly for untimed sessions", () => {
    const qMap = new Map(sampleBank.map((q) => [q.id, q]));
    const now = 1_700_000_050_000;
    const exam = {
      mode: "quick",
      timed: false,
      startedAt: now - 45_000,
      durationMs: 0,
      orderIds: ["q1", "q2"],
      answers: { q1: 0, q2: 0 },
      review: {},
      finished: false,
    };
    const metrics = calculateExamMetrics(exam, qMap, now);
    expect(metrics.remainingMs).toBe(0);
    expect(metrics.timeSpentMs).toBe(45_000);
    expect(metrics.correctCount).toBe(1);
    expect(metrics.wrongCount).toBe(1);
    expect(metrics.scorePercent).toBe(50);
  });
});
