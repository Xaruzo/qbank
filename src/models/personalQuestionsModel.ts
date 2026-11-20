/**
 * Model for user's personal private questions, pending admin review submissions,
 * and admin-approved community questions.
 */
import { supabase, isNetworkOrFetchError } from "../utils/supabaseClient";

export type ModerationStatus = "private" | "pending" | "approved" | "rejected";

export interface PersonalQuestion {
  id: string;
  user_id: string;
  user_email: string;
  full_name: string;
  topic: string;
  question: string;
  choices: string[];
  correct: number;
  solution: string;
  label: string;
  is_public: boolean;
  moderation_status: ModerationStatus;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  shared_at?: string | null;
  created_at: string;
  updated_at: string;
}

const LOCAL_STORAGE_KEY = "cse-my-personal-questions-v1";

function readLocalQuestions(): PersonalQuestion[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.map(normalizePersonalQuestion) : [];
  } catch {
    return [];
  }
}

function writeLocalQuestions(list: PersonalQuestion[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore localStorage quota errors
  }
}

export function normalizePersonalQuestion(raw: Partial<PersonalQuestion>): PersonalQuestion {
  const now = new Date().toISOString();
  const inferredStatus: ModerationStatus =
    raw.moderation_status === "private" ||
    raw.moderation_status === "pending" ||
    raw.moderation_status === "approved" ||
    raw.moderation_status === "rejected"
      ? raw.moderation_status
      : raw.is_public
        ? "approved"
        : "private";

  return {
    id: raw.id || `pq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: raw.user_id || "local_user",
    user_email: raw.user_email || "user@example.com",
    full_name: raw.full_name || "Reviewer",
    topic: raw.topic || "numerical",
    question: raw.question || "",
    choices: Array.isArray(raw.choices) ? raw.choices : ["", "", "", ""],
    correct: typeof raw.correct === "number" ? raw.correct : 0,
    solution: raw.solution || "",
    label: raw.label || "",
    is_public: inferredStatus === "approved",
    moderation_status: inferredStatus,
    submitted_at: raw.submitted_at || null,
    reviewed_at: raw.reviewed_at || null,
    reviewed_by: raw.reviewed_by || null,
    rejection_reason: raw.rejection_reason || null,
    shared_at: inferredStatus === "approved" ? raw.shared_at || now : null,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

function belongsToUser(q: PersonalQuestion, userId: string, userEmail: string): boolean {
  if (userId && userId !== "local_user" && q.user_id === userId) return true;
  if (userEmail && userEmail !== "user@example.com" && q.user_email?.toLowerCase() === userEmail.toLowerCase()) {
    return true;
  }
  return userId === "local_user" && q.user_id === "local_user";
}

async function upsertCommunityQuestion(record: PersonalQuestion): Promise<void> {
  if (!supabase) return;
  await supabase.from("questions").upsert(
    {
      id: `comm_${record.id}`,
      topic: record.topic,
      label: record.label
        ? `${record.label} (Shared by ${record.full_name})`
        : `Shared by ${record.full_name}`,
      question: record.question,
      choices: record.choices,
      correct: record.correct,
      solution: record.solution
        ? `${record.solution}\n\nContributed by: ${record.full_name} (${record.user_email})`
        : `Contributed by: ${record.full_name}`,
      created_at: record.created_at,
      updated_at: record.updated_at,
    },
    { onConflict: "id" }
  );
}

async function deleteCommunityQuestion(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("questions").delete().eq("id", `comm_${id}`);
}

export const personalQuestionsModel = {
  async getMyQuestions(userId: string, userEmail: string): Promise<PersonalQuestion[]> {
    if (!userId && !userEmail) return [];

    const local = readLocalQuestions();

    if (supabase && userId && userId !== "local_user") {
      try {
        let query = supabase.from("personal_questions").select("*");
        if (userEmail && userEmail !== "user@example.com") {
          query = query.or(`user_id.eq.${userId},user_email.eq.${userEmail}`);
        } else {
          query = query.eq("user_id", userId);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error && Array.isArray(data)) {
          const remoteNormalized = data.map(normalizePersonalQuestion);
          const remoteMap = new Map(remoteNormalized.map((q) => [q.id, q]));
          const merged = [...remoteNormalized];
          for (const lq of local) {
            if (belongsToUser(lq, userId, userEmail) && !remoteMap.has(lq.id)) {
              merged.push(lq);
            }
          }
          const otherLocal = local.filter((lq) => !belongsToUser(lq, userId, userEmail));
          writeLocalQuestions([...merged, ...otherLocal]);
          return merged;
        }
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to fetch personal questions from Supabase:", e);
        }
      }
    }

    return local.filter((q) => belongsToUser(q, userId, userEmail));
  },

  async savePersonalQuestion(
    q: Partial<PersonalQuestion> & { submitForReview?: boolean },
    userId: string,
    userEmail: string,
    fullName: string
  ): Promise<PersonalQuestion> {
    const now = new Date().toISOString();
    const id = q.id || `pq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Determine target moderation status:
    // Publishing a user question submits it to the Pending Admin Review queue first.
    const wantReview = Boolean(q.submitForReview ?? q.is_public);
    const nextStatus: ModerationStatus = wantReview ? "pending" : "private";

    const record = normalizePersonalQuestion({
      ...q,
      id,
      user_id: userId || "local_user",
      user_email: userEmail || "user@example.com",
      full_name: fullName || "Reviewer",
      topic: q.topic || "numerical",
      question: q.question || "",
      choices: Array.isArray(q.choices) ? q.choices : ["", "", "", ""],
      correct: typeof q.correct === "number" ? q.correct : 0,
      solution: q.solution || "",
      label: q.label || "",
      is_public: false,
      moderation_status: nextStatus,
      submitted_at: wantReview ? q.submitted_at || now : null,
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      shared_at: null,
      created_at: q.created_at || now,
      updated_at: now,
    });

    const local = readLocalQuestions();
    const idx = local.findIndex((item) => item.id === id);
    if (idx >= 0) {
      local[idx] = record;
    } else {
      local.unshift(record);
    }
    writeLocalQuestions(local);

    if (supabase && record.user_id && record.user_id !== "local_user") {
      try {
        await supabase.from("personal_questions").upsert(
          {
            id: record.id,
            user_id: record.user_id,
            user_email: record.user_email,
            full_name: record.full_name,
            topic: record.topic,
            question: record.question,
            choices: record.choices,
            correct: record.correct,
            solution: record.solution,
            label: record.label,
            is_public: record.is_public,
            moderation_status: record.moderation_status,
            submitted_at: record.submitted_at,
            reviewed_at: record.reviewed_at,
            reviewed_by: record.reviewed_by,
            rejection_reason: record.rejection_reason,
            shared_at: record.shared_at,
            created_at: record.created_at,
            updated_at: record.updated_at,
          },
          { onConflict: "id" }
        );

        // If a previously published question was moved back to private or re-queued for edit review, remove from live pool
        await deleteCommunityQuestion(record.id);
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to sync personal question to Supabase:", e);
        }
      }
    }

    return record;
  },

  async deletePersonalQuestion(id: string): Promise<void> {
    const local = readLocalQuestions();
    const targetItem = local.find((item) => item.id === id);
    writeLocalQuestions(local.filter((item) => item.id !== id));

    if (supabase && (!targetItem || targetItem.user_id !== "local_user")) {
      try {
        await supabase.from("personal_questions").delete().eq("id", id);
        await deleteCommunityQuestion(id);
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to delete personal question from Supabase:", e);
        }
      }
    }
  },

  async submitForReview(id: string): Promise<PersonalQuestion | null> {
    const local = readLocalQuestions();
    const idx = local.findIndex((item) => item.id === id);
    if (idx < 0) return null;

    const now = new Date().toISOString();
    const updated: PersonalQuestion = {
      ...local[idx],
      is_public: false,
      moderation_status: "pending",
      submitted_at: now,
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      shared_at: null,
      updated_at: now,
    };
    local[idx] = updated;
    writeLocalQuestions(local);

    if (supabase && updated.user_id && updated.user_id !== "local_user") {
      try {
        await supabase
          .from("personal_questions")
          .update({
            is_public: false,
            moderation_status: "pending",
            submitted_at: updated.submitted_at,
            reviewed_at: null,
            reviewed_by: null,
            rejection_reason: null,
            shared_at: null,
            updated_at: updated.updated_at,
          })
          .eq("id", id);
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to submit question for review:", e);
        }
      }
    }

    return updated;
  },

  async makePrivate(id: string): Promise<PersonalQuestion | null> {
    const local = readLocalQuestions();
    const idx = local.findIndex((item) => item.id === id);
    if (idx < 0) return null;

    const now = new Date().toISOString();
    const updated: PersonalQuestion = {
      ...local[idx],
      is_public: false,
      moderation_status: "private",
      submitted_at: null,
      shared_at: null,
      updated_at: now,
    };
    local[idx] = updated;
    writeLocalQuestions(local);

    if (supabase && updated.user_id && updated.user_id !== "local_user") {
      try {
        await supabase
          .from("personal_questions")
          .update({
            is_public: false,
            moderation_status: "private",
            submitted_at: null,
            shared_at: null,
            updated_at: updated.updated_at,
          })
          .eq("id", id);

        await deleteCommunityQuestion(id);
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to make personal question private:", e);
        }
      }
    }

    return updated;
  },

  async getPendingReviewQuestions(): Promise<PersonalQuestion[]> {
    const localPending = readLocalQuestions().filter(
      (q) => q.moderation_status === "pending"
    );

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("personal_questions")
          .select("*")
          .eq("moderation_status", "pending")
          .order("submitted_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const remotePending = data.map(normalizePersonalQuestion);
          const seen = new Set(remotePending.map((q) => q.id));
          return [
            ...remotePending,
            ...localPending.filter((q) => q.user_id === "local_user" && !seen.has(q.id)),
          ];
        }
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to fetch pending moderation queue from Supabase:", e);
        }
      }
    }

    return localPending;
  },

  async approvePendingQuestion(
    question: PersonalQuestion,
    reviewerEmail: string
  ): Promise<PersonalQuestion> {
    const now = new Date().toISOString();
    const approved: PersonalQuestion = {
      ...question,
      is_public: true,
      moderation_status: "approved",
      reviewed_at: now,
      reviewed_by: reviewerEmail || "Admin",
      rejection_reason: null,
      shared_at: now,
      updated_at: now,
    };

    const local = readLocalQuestions();
    const idx = local.findIndex((item) => item.id === approved.id);
    if (idx >= 0) {
      local[idx] = approved;
      writeLocalQuestions(local);
    }

    if (supabase && approved.user_id && approved.user_id !== "local_user") {
      try {
        await supabase
          .from("personal_questions")
          .update({
            is_public: true,
            moderation_status: "approved",
            reviewed_at: approved.reviewed_at,
            reviewed_by: approved.reviewed_by,
            rejection_reason: null,
            shared_at: approved.shared_at,
            updated_at: approved.updated_at,
          })
          .eq("id", approved.id);

        await upsertCommunityQuestion(approved);
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to approve pending question:", e);
        }
      }
    }

    return approved;
  },

  async rejectPendingQuestion(
    question: PersonalQuestion,
    reviewerEmail: string,
    reason?: string
  ): Promise<PersonalQuestion> {
    const now = new Date().toISOString();
    const rejected: PersonalQuestion = {
      ...question,
      is_public: false,
      moderation_status: "rejected",
      reviewed_at: now,
      reviewed_by: reviewerEmail || "Admin",
      rejection_reason: (reason || "").trim() || null,
      shared_at: null,
      updated_at: now,
    };

    const local = readLocalQuestions();
    const idx = local.findIndex((item) => item.id === rejected.id);
    if (idx >= 0) {
      local[idx] = rejected;
      writeLocalQuestions(local);
    }

    if (supabase && rejected.user_id && rejected.user_id !== "local_user") {
      try {
        await supabase
          .from("personal_questions")
          .update({
            is_public: false,
            moderation_status: "rejected",
            reviewed_at: rejected.reviewed_at,
            reviewed_by: rejected.reviewed_by,
            rejection_reason: rejected.rejection_reason,
            shared_at: null,
            updated_at: rejected.updated_at,
          })
          .eq("id", rejected.id);

        await deleteCommunityQuestion(rejected.id);
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to reject pending question:", e);
        }
      }
    }

    return rejected;
  },
};
