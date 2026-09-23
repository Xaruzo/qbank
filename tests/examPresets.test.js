import { describe, it, expect } from "vitest";
import { EXAM_PRESETS, TOPICS } from "../src/constants/appConstants.js";
import { buildMockExamAttempt } from "../src/utils/mockExamAnalytics.js";

describe("Civil Service Exam Presets Configuration", () => {
  it("defines accurate professional level specifications (170 items, 3h 10m)", () => {
    const pro = EXAM_PRESETS.professional;
    expect(pro).toBeDefined();
    expect(pro.id).toBe("professional");
    expect(pro.totalItems).toBe(170);
    // 3h 10m = 190 minutes = 11,400,000 ms
    expect(pro.durationMs).toBe(11_400_000);
    expect(pro.durationLabel).toBe("3h 10m");
    expect(pro.targetTopics).toContain("analytical");
    expect(pro.targetTopics).not.toContain("clerical");
    expect(pro.excludedTopics).toContain("clerical");
  });

  it("defines accurate subprofessional level specifications (165 items, 2h 40m)", () => {
    const subpro = EXAM_PRESETS.subprofessional;
    expect(subpro).toBeDefined();
    expect(subpro.id).toBe("subprofessional");
    expect(subpro.totalItems).toBe(165);
    // 2h 40m = 160 minutes = 9,600,000 ms
    expect(subpro.durationMs).toBe(9_600_000);
    expect(subpro.durationLabel).toBe("2h 40m");
    expect(subpro.targetTopics).toContain("clerical");
    expect(subpro.targetTopics).not.toContain("analytical");
    expect(subpro.excludedTopics).toContain("analytical");
  });

  it("includes clerical in global TOPICS with proper styling metadata", () => {
    const clerical = TOPICS.find((t) => t.id === "clerical");
    expect(clerical).toBeDefined();
    expect(clerical.label).toBe("Clerical");
    expect(clerical.short).toBe("CLE");
    expect(clerical.color).toBeDefined();
  });
});

describe("Preset Question Filtering", () => {
  const bank = [
    { id: "q1", topic: "numerical", question: "Math" },
    { id: "q2", topic: "verbal", question: "Grammar" },
    { id: "q3", topic: "general", question: "Constitution" },
    { id: "q4", topic: "analytical", question: "Syllogism" },
    { id: "q5", topic: "clerical", question: "Alphabetical Filing" },
  ];

  it("filters candidate questions for Professional (excludes clerical)", () => {
    const proPreset = EXAM_PRESETS.professional;
    const candidates = bank.filter((q) => !proPreset.excludedTopics.includes(q.topic));
    const ids = candidates.map((q) => q.id);
    expect(ids).toEqual(["q1", "q2", "q3", "q4"]);
    expect(ids).not.toContain("q5");
  });

  it("filters candidate questions for Subprofessional (excludes analytical)", () => {
    const subproPreset = EXAM_PRESETS.subprofessional;
    const candidates = bank.filter((q) => !subproPreset.excludedTopics.includes(q.topic));
    const ids = candidates.map((q) => q.id);
    expect(ids).toEqual(["q1", "q2", "q3", "q5"]);
    expect(ids).not.toContain("q4");
  });
});

describe("Mock Exam Attempts for Both Presets", () => {
  const questions = [
    { id: "p1", topic: "analytical", correct: 0 },
    { id: "s1", topic: "clerical", correct: 1 },
  ];
  const qMap = new Map(questions.map((q) => [q.id, q]));

  it("builds an attempt preserving professional mode", () => {
    const exam = {
      sessionId: "session-pro",
      mode: "professional",
      startedAt: 1_000_000,
      durationMs: EXAM_PRESETS.professional.durationMs,
      totalCount: 1,
      orderIds: ["p1"],
      answers: { p1: 0 },
    };
    const attempt = buildMockExamAttempt(exam, qMap, 1_050_000);
    expect(attempt.mode).toBe("professional");
    expect(attempt.scorePercent).toBe(100);
    expect(attempt.correctCount).toBe(1);
    expect(attempt.topicStats[0].topicId).toBe("analytical");
  });

  it("builds an attempt preserving subprofessional mode", () => {
    const exam = {
      sessionId: "session-subpro",
      mode: "subprofessional",
      startedAt: 1_000_000,
      durationMs: EXAM_PRESETS.subprofessional.durationMs,
      totalCount: 1,
      orderIds: ["s1"],
      answers: { s1: 1 },
    };
    const attempt = buildMockExamAttempt(exam, qMap, 1_050_000);
    expect(attempt.mode).toBe("subprofessional");
    expect(attempt.scorePercent).toBe(100);
    expect(attempt.correctCount).toBe(1);
    expect(attempt.topicStats[0].topicId).toBe("clerical");
  });
});
