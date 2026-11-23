import { describe, it, expect } from "vitest";
import { isFocusShellView } from "../src/utils/focusShell";

describe("isFocusShellView", () => {
  it("enables focus shell during question answering and active mock exams", () => {
    expect(isFocusShellView("detail")).toBe(true);
    expect(isFocusShellView("mockRun")).toBe(true);
  });

  it("keeps global navigation chrome on browsing, setup, and management views", () => {
    const standardViews = [
      "landing",
      "signIn",
      "dashboard",
      "list",
      "add",
      "mock",
      "mockAttempt",
      "tips",
      "tipDetail",
      "notes",
      "reels",
      "my-questions",
      "settings",
    ];
    for (const view of standardViews) {
      expect(isFocusShellView(view)).toBe(false);
    }
  });
});
