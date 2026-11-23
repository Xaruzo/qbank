import { describe, it, expect } from "vitest";
import {
  stripChoicePrefix,
  normalizeTopicId,
  normalizeProblemLabel,
  normalizeExtractedQuestion,
} from "../src/utils/questionImageImport";

describe("questionImageImport", () => {
  it("strips A-E option prefixes without altering regular words starting with A-E", () => {
    expect(stripChoicePrefix("A. 15")).toBe("15");
    expect(stripChoicePrefix("b) 20")).toBe("20");
    expect(stripChoicePrefix("(C) 22")).toBe("22");
    expect(stripChoicePrefix("D: 24")).toBe("24");
    expect(stripChoicePrefix("E - 30")).toBe("30");
    expect(stripChoicePrefix("A government office has 40 women.")).toBe(
      "A government office has 40 women."
    );
    expect(stripChoicePrefix("Both A and B")).toBe("Both A and B");
  });

  it("normalizes topic names and synonyms to valid CSE topic IDs", () => {
    expect(normalizeTopicId("numerical")).toBe("numerical");
    expect(normalizeTopicId("Numerical Ability")).toBe("numerical");
    expect(normalizeTopicId("Verbal Reasoning & Grammar")).toBe("verbal");
    expect(normalizeTopicId("Analytical / Logic")).toBe("analytical");
    expect(normalizeTopicId("Clerical Operations & Filing")).toBe("clerical");
    expect(normalizeTopicId("General Information - Philippine Constitution")).toBe("general");
    expect(normalizeTopicId("Unknown Category")).toBe("numerical");
  });

  it("matches preset problem labels case-insensitively and preserves custom labels", () => {
    expect(normalizeProblemLabel("ratio")).toBe("Ratio");
    expect(normalizeProblemLabel("  AGE PROBLEM ")).toBe("Age Problem");
    expect(normalizeProblemLabel("Ratio Problem")).toBe("Ratio Problem");
    expect(normalizeProblemLabel("Data Interpretation")).toBe("Data Interpretation");
    expect(normalizeProblemLabel("")).toBe("");
  });

  it("normalizes 5-choice A-E extractions with solution when includeSolution is true", () => {
    const result = normalizeExtractedQuestion(
      {
        question:
          "A government office has employees in the ratio of 3 men to 5 women. If there are 40 women in the office, how many men are there?",
        choices: ["A. 15", "B. 20", "C. 22", "D. 24", "E. 30"],
        topic: "Numerical Ability",
        label: "Ratio Problem",
        correctIndex: 3,
        solution: "3 : 5 = x : 40 -> 5x = 120 -> x = 24. Answer: D. 24",
      },
      true
    );

    expect(result).toEqual({
      question:
        "A government office has employees in the ratio of 3 men to 5 women. If there are 40 women in the office, how many men are there?",
      choices: ["15", "20", "22", "24", "30"],
      topic: "numerical",
      label: "Ratio Problem",
      correctIndex: 3,
      solution: "3 : 5 = x : 40 -> 5x = 120 -> x = 24. Answer: D. 24",
    });
  });

  it("drops an empty 5th choice slot, clears solution when disabled, and clamps invalid correctIndex", () => {
    const result = normalizeExtractedQuestion(
      {
        question: "What is 15% of 200?",
        choices: ["A. 20", "B. 30", "C. 40", "D. 50", ""],
        topic: "math",
        label: "Percentage",
        correctIndex: 4,
        solution: "Should be omitted when includeSolution is false",
      },
      false
    );

    expect(result.choices).toEqual(["20", "30", "40", "50"]);
    expect(result.correctIndex).toBeNull();
    expect(result.solution).toBe("");
    expect(result.topic).toBe("numerical");
  });

  it("classifies Word Analogy and :: analogy questions as analytical even if returned as verbal", () => {
    expect(normalizeTopicId("Word Analogy")).toBe("analytical");
    expect(normalizeTopicId("Verbal Analogy")).toBe("analytical");

    const analogyFromStem = normalizeExtractedQuestion(
      {
        question: "Zimbabwe : Africa :: _____ : _____",
        choices: [
          "a. Philippines : Asia",
          "b. Cebu : Visayas",
          "c. Manila : Philippines",
          "d. USA : Europe",
        ],
        topic: "verbal",
        label: "Word Analogy",
        correctIndex: 0,
        solution: "Zimbabwe is a country in Africa; Philippines is a country in Asia.",
      },
      true
    );

    expect(analogyFromStem.topic).toBe("analytical");
    expect(analogyFromStem.label).toBe("Word Analogy");
    expect(analogyFromStem.choices).toEqual([
      "Philippines : Asia",
      "Cebu : Visayas",
      "Manila : Philippines",
      "USA : Europe",
    ]);

    const analogyFromVocabularyLabel = normalizeExtractedQuestion(
      {
        question: "Author is to Book as Composer is to ____",
        choices: ["A. Symphony : Sound", "B. Brush : Canvas", "C. Poet : Verse", "D. Painter : Easel"],
        topic: "verbal",
        label: "Vocabulary",
        correctIndex: 0,
        solution: "",
      },
      false
    );
    expect(analogyFromVocabularyLabel.topic).toBe("analytical");
    expect(analogyFromVocabularyLabel.label).toBe("Word Analogy");

    const trueVerbal = normalizeExtractedQuestion(
      {
        question: "The word BENEVOLENT most nearly means:",
        choices: ["A. Charitable", "B. Hostile", "C. Indifferent", "D. Arrogant"],
        topic: "verbal",
        label: "Vocabulary",
        correctIndex: 0,
        solution: "",
      },
      false
    );
    expect(trueVerbal.topic).toBe("verbal");
    expect(trueVerbal.label).toBe("Vocabulary");
  });
});
