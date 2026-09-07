import { describe, it, expect } from "vitest";
import { parseMathText } from "../src/utils/parseMathText.js";

describe("parseMathText", () => {
  it("returns a single text part for plain prose", () => {
    expect(parseMathText("The quick brown fox")).toEqual([
      { type: "text", value: "The quick brown fox" },
    ]);
  });

  it("returns a single empty text part for empty or null input", () => {
    expect(parseMathText("")).toEqual([{ type: "text", value: "" }]);
    expect(parseMathText(null)).toEqual([{ type: "text", value: "" }]);
  });

  it("parses plain numeric fractions", () => {
    expect(parseMathText("3/4")).toEqual([{ type: "frac", num: "3", den: "4" }]);
  });

  it("parses parenthesized complex fractions", () => {
    expect(parseMathText("(a+b)/(c+d)")).toEqual([
      { type: "frac", num: "a+b", den: "c+d" },
    ]);
  });

  it("decodes superscript/subscript fraction notation", () => {
    expect(parseMathText("²/₃")).toEqual([{ type: "frac", num: "2", den: "3" }]);
  });

  it("decodes vulgar fractions and keeps surrounding text", () => {
    expect(parseMathText("½ cup")).toEqual([
      { type: "vulgar", value: "½" },
      { type: "text", value: " cup" },
    ]);
  });

  it("parses mixed content without losing text", () => {
    const parts = parseMathText("Add 3/4 cups and ½ tsp of salt");
    expect(parts).toHaveLength(5);
    expect(parts[0]).toEqual({ type: "text", value: "Add " });
    expect(parts[1]).toEqual({ type: "frac", num: "3", den: "4" });
    expect(parts[2]).toEqual({ type: "text", value: " cups and " });
    expect(parts[3]).toEqual({ type: "vulgar", value: "½" });
    expect(parts[4]).toEqual({ type: "text", value: " tsp of salt" });
  });
});