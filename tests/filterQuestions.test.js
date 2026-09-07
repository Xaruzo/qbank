import { describe, it, expect } from "vitest";
import { filterAndSortQuestions } from "../src/controllers/useQuestionsController.js";

const q = (over) => ({
  id: "x",
  question: "",
  choices: [],
  solution: "",
  label: "",
  topic: "t1",
  favorite: false,
  ...over,
});

const questions = [
  q({ id: "1", question: "What is alpha decay?", topic: "t1", label: "Basics", favorite: true }),
  q({ id: "2", question: "Explain beta particles", topic: "t2", choices: ["gamma choice", "delta"] }),
  q({ id: "3", question: "Gamma rays overview", topic: "t1", solution: "alpha solution detail", dateAdded: "2026-01-02T00:00:00Z" }),
  q({ id: "4", question: "Delta epsilon", topic: "t3", label: "Advanced", dateAdded: "2026-02-01T00:00:00Z" }),
];

// The hook lowercases the search needle before calling the pipeline
// (see useQuestionsController); `run` mirrors that same contract.
const run = ({ search = "", ...rest } = {}) =>
  filterAndSortQuestions(questions, {
    search: search.toLowerCase(),
    topicFilter: "all",
    labelFilter: "all",
    sortBy: "index",
    ...rest,
  });

const ids = (result) => result.map((x) => x.id);

describe("filterAndSortQuestions — filtering", () => {
  it("returns everything when search is empty", () => {
    expect(run()).toHaveLength(4);
  });

  it("matches case-insensitively across question, choices, and solution", () => {
    expect(ids(run({ search: "alpha decay" }))).toEqual(["1"]);
    expect(ids(run({ search: "GAMMA CHOICE" }))).toEqual(["2"]);
    expect(ids(run({ search: "solution detail" }))).toEqual(["3"]);
  });

  it("matches against labels", () => {
    expect(ids(run({ search: "advanced" }))).toEqual(["4"]);
  });

  it("narrows by topic and label filters", () => {
    expect(ids(run({ topicFilter: "t1" }))).toEqual(["1", "3"]);
    expect(ids(run({ labelFilter: "Basics" }))).toEqual(["1"]);
  });

  it("combines search with filters", () => {
    expect(ids(run({ search: "alpha", topicFilter: "t1" }))).toEqual(["1", "3"]);
    expect(ids(run({ search: "alpha", topicFilter: "t2" }))).toEqual([]);
  });
});

describe("filterAndSortQuestions — sorting", () => {
  it("sorts newest first by dateAdded, falling back to numeric id", () => {
    expect(ids(run({ sortBy: "newest" }))[0]).toBe("4");
    expect(ids(run({ sortBy: "newest" }))[3]).toBe("1");
  });

  it("sorts oldest first", () => {
    expect(ids(run({ sortBy: "oldest" }))[0]).toBe("1");
  });

  it("sorts a-z / z-a by question text", () => {
    expect(ids(run({ sortBy: "a-z" }))[0]).toBe("4");
    expect(ids(run({ sortBy: "z-a" }))[0]).toBe("1");
  });

  it("sorts by label with empty labels sinking to the end", () => {
    expect(ids(run({ sortBy: "label-a-z" }))).toEqual(["4", "1", "2", "3"]);
  });

  it("keeps favorites first for the default sort with stable order", () => {
    expect(ids(run({ sortBy: "favorites" }))[0]).toBe("1");
    expect(ids(run({ sortBy: "favorites" }))).toEqual(["1", "2", "3", "4"]);
  });
});

describe("filterAndSortQuestions — integrity", () => {
  it("returns the same question objects (not copies)", () => {
    const result = run({ search: "alpha decay" });
    expect(result[0]).toBe(questions[0]);
  });

  it("does not mutate the input array", () => {
    const before = [...questions];
    run({ sortBy: "z-a" });
    expect(questions).toEqual(before);
  });
});