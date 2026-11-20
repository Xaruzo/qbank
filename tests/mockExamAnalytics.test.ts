import { describe, it, expect } from "vitest";
import {
  formatExamDuration,
  formatAttemptDate,
  calculateExamMetrics,
  buildMockExamAttempt,
  buildReviewExamFromAttempt,
  buildMistakeDrillExam,
  buildMiniMockExamSession,
  getAttemptModeLabel,
} from "../src/utils/mockExamAnalytics";

type AnalyticsQuestion = {
  id: string;
  topic: string;
  correct: number;
  question: string;
};

// Topic ids deliberately NOT in TOPICS so bucket fallbacks ("Other") keep
// the assertions independent of the live topic catalog.
const questions: AnalyticsQuestion[] = [
  { id: "1", topic: "t1", correct: 0, question: "Live text one" },
  { id: "2", topic: "t1", correct: 1, question: "Live text two" },
  { id: "3", topic: "t2", correct: 2, question: "Live text three" },
];
const qMap = new Map<string, AnalyticsQuestion>(
  questions.map((q): [string, AnalyticsQuestion] => [q.id, q])
);

const exam = {
  sessionId: "s1",
  mode: "practice",
  startedAt: 1_000_000,
  durationMs: 600_000,
  totalCount: 3,
  orderIds: ["1", "2", "3"],
  answers: { 1: 0, 2: 2 }, // q1 correct, q2 wrong, q3 unanswered
  review: { 2: true },
};

describe("formatExamDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatExamDuration(3_661_000)).toBe("1h 1m");
  });

  it("clamps negative durations to zero", () => {
    expect(formatExamDuration(-5)).toBe("0h 0m");
    expect(formatExamDuration(0)).toBe("0h 0m");
  });
});

describe("formatAttemptDate", () => {
  it("returns a placeholder for missing or invalid dates", () => {
    expect(formatAttemptDate(null)).toBe("Unknown date");
    expect(formatAttemptDate("not-a-date")).toBe("Unknown date");
  });

  it("formats valid dates with the year included", () => {
    const out = formatAttemptDate("2026-01-05T10:30:00Z");
    expect(out).not.toBe("Unknown date");
    expect(out).toMatch(/2026/);
  });
});

describe("calculateExamMetrics", () => {
  const metrics = calculateExamMetrics(exam, qMap, 1_100_000);

  it("counts correct, wrong, and unanswered answers", () => {
    expect(metrics.correctCount).toBe(1);
    expect(metrics.wrongCount).toBe(1);
    expect(metrics.unansweredCount).toBe(1);
    expect(metrics.answeredCount).toBe(2);
    expect(metrics.reviewCount).toBe(1);
  });

  it("derives remaining and spent time when not stored explicitly", () => {
    expect(metrics.remainingMs).toBe(500_000);
    expect(metrics.timeSpentMs).toBe(100_000);
  });

  it("buckets per topic with rounded accuracy", () => {
    const t1 = metrics.topicStats.find((b) => b.topicId === "t1");
    const t2 = metrics.topicStats.find((b) => b.topicId === "t2");
    expect(t1.total).toBe(2);
    expect(t1.correct).toBe(1);
    expect(t1.wrong).toBe(1);
    expect(t1.accuracy).toBe(50);
    expect(t2.unanswered).toBe(1);
    expect(t2.accuracy).toBe(0);
  });

  it("scores by correct over total", () => {
    expect(metrics.scorePercent).toBe(33);
  });

  it("honors an explicit timeLeftMs over the derived value", () => {
    const m = calculateExamMetrics({ ...exam, timeLeftMs: 42_000 }, qMap, 1_100_000);
    expect(m.remainingMs).toBe(42_000);
    expect(m.timeSpentMs).toBe(558_000);
  });
});

describe("buildMockExamAttempt", () => {
  const attempt = buildMockExamAttempt(exam, qMap, 1_200_000);

  it("records per-question answer correctness", () => {
    expect(attempt.questions[0]).toMatchObject({
      id: "1",
      userAnswer: 0,
      isCorrect: true,
      wasAnswered: true,
    });
    expect(attempt.questions[1]).toMatchObject({
      id: "2",
      userAnswer: 2,
      isCorrect: false,
      wasAnswered: true,
    });
    expect(attempt.questions[2]).toMatchObject({
      id: "3",
      userAnswer: null,
      isCorrect: false,
      wasAnswered: false,
    });
  });

  it("carries identity and timing from the exam", () => {
    expect(attempt.id).toBe("s1");
    expect(attempt.mode).toBe("practice");
    expect(attempt.completedAt).toBe(new Date(1_200_000).toISOString());
    expect(attempt.scorePercent).toBe(33);
  });
});

describe("buildReviewExamFromAttempt", () => {
  const baseAttempt = buildMockExamAttempt(exam, qMap, 1_200_000);

  it("reconstructs answers and starts at the requested question", () => {
    const review = buildReviewExamFromAttempt(baseAttempt, qMap, "2");
    expect(review.answers).toEqual({ 1: 0, 2: 2 });
    expect(review.orderIds).toEqual(["1", "2", "3"]);
    expect(review.currentIndex).toBe(1);
    expect(review.finished).toBe(true);
    expect(review.isReviewSession).toBe(true);
  });

  it("prefers live question data and falls back to attempt snapshots", () => {
    const liveMap = new Map(qMap);
    const review = buildReviewExamFromAttempt(baseAttempt, liveMap, null);
    expect(review.questionSnapshots["2"].question).toBe("Live text two");

    // Question no longer in the live bank -> falls back to the attempt record
    const partialMap = new Map<string, AnalyticsQuestion | undefined>([
      ["1", qMap.get("1")],
      ["2", qMap.get("2")],
    ]);
    const review2 = buildReviewExamFromAttempt(baseAttempt, partialMap, null);
    expect(review2.questionSnapshots["3"].question).toBe("Question text unavailable");
    expect(review2.questionSnapshots["3"].topic).toBe("t2");
    expect(review2.questionSnapshots["3"].correct).toBe(2);
  });
});

describe("buildMiniMockExamSession & mini-mock attempt handling", () => {
  it("builds a timed or untimed mini-mock session with embedded snapshots", () => {
    const timedSession = buildMiniMockExamSession({
      miniMockId: "mm_123",
      title: "Ratio Sprint",
      questions: [
        {
          id: "pq_1",
          topic: "numerical",
          question: "Ratio of 1/2 to 1/4?",
          choices: ["1:2", "2:1", "1:4", "4:1"],
          correct: 1,
          solution: "Multiply by 4.",
        },
        {
          id: "pq_2",
          topic: "verbal",
          question: "Pick the synonym of candid.",
          choices: ["Frank", "Secretive", "Hasty", "Mild"],
          correct: 0,
        },
      ],
      timed: true,
      durationMinutes: 5,
      shuffle: false,
    });

    expect(timedSession.mode).toBe("mini-mock");
    expect(timedSession.miniMockId).toBe("mm_123");
    expect(timedSession.returnView).toBe("my-questions");
    expect(timedSession.durationMs).toBe(5 * 60 * 1000);
    expect(timedSession.orderIds).toEqual(["pq_1", "pq_2"]);
    expect(timedSession.questionSnapshots["pq_1"].solution).toBe("Multiply by 4.");
    expect(getAttemptModeLabel(timedSession.mode)).toBe("Mini Mock");

    const untimedSession = buildMiniMockExamSession({
      title: "Untimed Deck",
      questions: [
        {
          id: "pq_1",
          topic: "numerical",
          question: "Test?",
          choices: ["A", "B", "C", "D"],
          correct: 0,
        },
      ],
      timed: false,
    });
    expect(untimedSession.timed).toBe(false);
    expect(untimedSession.durationMs).toBe(0);
  });

  it("preserves custom questionSnapshots through attempt history, review, and mistake drills", () => {
    const miniExam = buildMiniMockExamSession({
      miniMockId: "mm_99",
      title: "Custom Quiz",
      questions: [
        {
          id: "pq_a",
          topic: "numerical",
          question: "2 + 2 = ?",
          choices: ["3", "4", "5", "6"],
          correct: 1,
        },
        {
          id: "pq_b",
          topic: "numerical",
          question: "3 + 3 = ?",
          choices: ["5", "6", "7", "8"],
          correct: 1,
        },
      ],
      timed: true,
      durationMinutes: 4,
    });

    const completedExam = {
      ...miniExam,
      finished: true,
      answers: { pq_a: 1, pq_b: 0 },
    };

    const emptyMap = new Map<string, AnalyticsQuestion>();
    const attempt = buildMockExamAttempt(completedExam, emptyMap, 5000);
    expect(attempt.correctCount).toBe(1);
    expect(attempt.wrongCount).toBe(1);
    expect(attempt.questionSnapshots?.pq_b?.question).toBe("3 + 3 = ?");

    const review = buildReviewExamFromAttempt(attempt, emptyMap);
    expect(review.questionSnapshots.pq_b.question).toBe("3 + 3 = ?");

    const drill = buildMistakeDrillExam(attempt, emptyMap);
    expect(drill.orderIds).toEqual(["pq_b"]);
    expect(drill.questionSnapshots?.pq_b?.question).toBe("3 + 3 = ?");
  });
});

