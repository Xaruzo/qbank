import { beforeEach, describe, expect, it, vi } from "vitest";

const backingStore = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => (backingStore.has(key) ? backingStore.get(key) ?? null : null),
  setItem: (key: string, value: string) => {
    backingStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    backingStore.delete(key);
  },
};

vi.mock("../src/utils/supabaseClient", () => ({
  supabase: null,
  isNetworkOrFetchError: () => false,
}));

beforeEach(() => {
  backingStore.clear();
  vi.stubGlobal("localStorage", localStorageStub);
});

const loadModel = async () => {
  vi.resetModules();
  return import("../src/models/personalQuestionsModel");
};

describe("personalQuestionsModel moderation workflow", () => {
  it("normalizes legacy records consistently with moderation_status", async () => {
    const { normalizePersonalQuestion } = await loadModel();

    const legacyPublic = normalizePersonalQuestion({ id: "q1", is_public: true });
    expect(legacyPublic.moderation_status).toBe("approved");
    expect(legacyPublic.is_public).toBe(true);

    const legacyPrivate = normalizePersonalQuestion({ id: "q2", is_public: false });
    expect(legacyPrivate.moderation_status).toBe("private");
    expect(legacyPrivate.is_public).toBe(false);

    const explicitPending = normalizePersonalQuestion({
      id: "q3",
      moderation_status: "pending",
      is_public: true,
    });
    expect(explicitPending.moderation_status).toBe("pending");
    expect(explicitPending.is_public).toBe(false);
  });

  it("places submitted questions into pending review instead of publishing immediately", async () => {
    const { personalQuestionsModel } = await loadModel();

    const saved = await personalQuestionsModel.savePersonalQuestion(
      {
        topic: "numerical",
        question: "What is 15% of 200?",
        choices: ["20", "25", "30", "35"],
        correct: 2,
        solution: "0.15 * 200 = 30",
        label: "Percentage",
        submitForReview: true,
      },
      "local_user",
      "user@example.com",
      "Reviewer"
    );

    expect(saved.moderation_status).toBe("pending");
    expect(saved.is_public).toBe(false);
    expect(saved.submitted_at).toBeTruthy();

    const queue = await personalQuestionsModel.getPendingReviewQuestions();
    expect(queue.map((item) => item.id)).toContain(saved.id);
  });

  it("allows admins to approve or return pending questions with feedback", async () => {
    const { personalQuestionsModel } = await loadModel();

    const submitted = await personalQuestionsModel.savePersonalQuestion(
      {
        topic: "verbal",
        question: "Select the grammatically correct sentence.",
        choices: ["A", "B", "C", "D"],
        correct: 0,
        submitForReview: true,
      },
      "local_user",
      "user@example.com",
      "Reviewer"
    );

    const rejected = await personalQuestionsModel.rejectPendingQuestion(
      submitted,
      "admin@example.com",
      "Clarify the distractors in options B and C."
    );

    expect(rejected.moderation_status).toBe("rejected");
    expect(rejected.is_public).toBe(false);
    expect(rejected.rejection_reason).toBe("Clarify the distractors in options B and C.");
    expect(rejected.reviewed_by).toBe("admin@example.com");

    const resubmitted = await personalQuestionsModel.submitForReview(rejected.id);
    expect(resubmitted?.moderation_status).toBe("pending");
    expect(resubmitted?.rejection_reason).toBeNull();

    const approved = await personalQuestionsModel.approvePendingQuestion(
      resubmitted!,
      "admin@example.com"
    );
    expect(approved.moderation_status).toBe("approved");
    expect(approved.is_public).toBe(true);
    expect(approved.shared_at).toBeTruthy();

    const queueAfterApproval = await personalQuestionsModel.getPendingReviewQuestions();
    expect(queueAfterApproval.map((item) => item.id)).not.toContain(approved.id);

    const withdrawn = await personalQuestionsModel.makePrivate(approved.id);
    expect(withdrawn?.moderation_status).toBe("private");
    expect(withdrawn?.is_public).toBe(false);
  });
});
