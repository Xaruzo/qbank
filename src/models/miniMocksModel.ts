/**
 * Model for user-created Mini Mock Exams (private & community-shared).
 * Users can bundle custom questions into timed/untimed mini mocks, practice them,
 * and publish them so other reviewers can try them and copy shareable links.
 */
import { supabase, isNetworkOrFetchError } from "../utils/supabaseClient";

export interface MiniMockQuestionSnapshot {
  id: string;
  topic: string;
  label?: string;
  question: string;
  choices: string[];
  correct: number;
  solution?: string;
}

export interface PersonalMiniMock {
  id: string;
  user_id: string;
  user_email: string;
  full_name: string;
  title: string;
  description: string;
  question_ids: string[];
  questions_snapshot: MiniMockQuestionSnapshot[];
  timed: boolean;
  duration_minutes: number;
  shuffle_questions: boolean;
  is_public: boolean;
  attempt_count: number;
  shared_at?: string | null;
  created_at: string;
  updated_at: string;
}

const LOCAL_MINI_MOCKS_KEY = "cse-my-mini-mocks-v1";
const PUBLIC_MINI_MOCKS_CACHE_KEY = "cse-public-mini-mocks-cache-v1";

function readLocalList(key: string): PersonalMiniMock[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalList(key: string, list: PersonalMiniMock[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}

function normalizeMiniMock(raw: Partial<PersonalMiniMock>): PersonalMiniMock {
  const now = new Date().toISOString();
  const snapshots = Array.isArray(raw.questions_snapshot)
    ? raw.questions_snapshot.filter((q) => q && typeof q.question === "string")
    : [];
  const questionIds = Array.isArray(raw.question_ids)
    ? raw.question_ids
    : snapshots.map((q) => q.id);

  return {
    id: raw.id || `mm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: raw.user_id || "local_user",
    user_email: raw.user_email || "",
    full_name: raw.full_name || "Reviewer",
    title: (raw.title || "Untitled Mini Mock").trim(),
    description: (raw.description || "").trim(),
    question_ids: questionIds,
    questions_snapshot: snapshots,
    timed: raw.timed !== false,
    duration_minutes: Math.max(1, Number(raw.duration_minutes) || Math.max(1, snapshots.length)),
    shuffle_questions: Boolean(raw.shuffle_questions),
    is_public: Boolean(raw.is_public),
    attempt_count: Math.max(0, Number(raw.attempt_count) || 0),
    shared_at: raw.is_public ? (raw.shared_at || now) : null,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

function belongsToUser(item: PersonalMiniMock, userId: string, userEmail: string): boolean {
  if (userId && userId !== "local_user" && item.user_id === userId) return true;
  if (userEmail && userEmail !== "user@example.com" && item.user_email && item.user_email.toLowerCase() === userEmail.toLowerCase()) {
    return true;
  }
  return userId === "local_user" && item.user_id === "local_user";
}

export const miniMocksModel = {
  async getMyMiniMocks(userId: string, userEmail: string): Promise<PersonalMiniMock[]> {
    const localAll = readLocalList(LOCAL_MINI_MOCKS_KEY).map(normalizeMiniMock);
    const localForUser = localAll.filter((m) => belongsToUser(m, userId, userEmail));

    if (supabase && userId && userId !== "local_user") {
      try {
        const cleanEmail = (userEmail || "").trim();
        let query = supabase.from("personal_mini_mocks").select("*");
        if (cleanEmail && cleanEmail !== "user@example.com") {
          query = query.or(`user_id.eq.${userId},user_email.eq.${cleanEmail}`);
        } else {
          query = query.eq("user_id", userId);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error && Array.isArray(data)) {
          const remoteNormalized = data.map((row) => normalizeMiniMock(row));
          const remoteIds = new Set(remoteNormalized.map((m) => m.id));
          // Only keep unsynced local items belonging to THIS authenticated user (never guest items)
          const mergedForUser = [
            ...remoteNormalized,
            ...localForUser.filter((m) => !remoteIds.has(m.id)),
          ];
          const otherUsersLocal = localAll.filter((m) => !belongsToUser(m, userId, userEmail));
          writeLocalList(LOCAL_MINI_MOCKS_KEY, [...mergedForUser, ...otherUsersLocal]);
          return mergedForUser;
        }
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to fetch mini mocks from Supabase:", e);
        }
      }
    }

    return localForUser;
  },

  async getPublicMiniMocks(): Promise<PersonalMiniMock[]> {
    const cachedPublic = readLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY).map(normalizeMiniMock);
    const localPublic = readLocalList(LOCAL_MINI_MOCKS_KEY)
      .map(normalizeMiniMock)
      .filter((m) => m.is_public);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("personal_mini_mocks")
          .select("*")
          .eq("is_public", true)
          .order("shared_at", { ascending: false })
          .limit(50);

        if (!error && Array.isArray(data)) {
          const normalized = data.map((row) => normalizeMiniMock(row));
          writeLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY, normalized);
          return normalized;
        }
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to fetch community mini mocks from Supabase:", e);
        }
      }
    }

    const seen = new Set<string>();
    const combined: PersonalMiniMock[] = [];
    for (const item of [...localPublic, ...cachedPublic]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }
    return combined;
  },

  async getMiniMockById(id: string): Promise<PersonalMiniMock | null> {
    if (!id) return null;
    const localMatch = [...readLocalList(LOCAL_MINI_MOCKS_KEY), ...readLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY)]
      .map(normalizeMiniMock)
      .find((m) => m.id === id);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("personal_mini_mocks")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (!error && data) {
          return normalizeMiniMock(data);
        }
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to lookup mini mock by id:", e);
        }
      }
    }

    return localMatch || null;
  },

  async saveMiniMock(
    input: Partial<PersonalMiniMock>,
    userId: string,
    userEmail: string,
    fullName: string
  ): Promise<PersonalMiniMock> {
    const now = new Date().toISOString();
    const record = normalizeMiniMock({
      ...input,
      user_id: userId || "local_user",
      user_email: userEmail || "user@example.com",
      full_name: fullName || "Reviewer",
      updated_at: now,
      created_at: input.created_at || now,
    });

    const localAll = readLocalList(LOCAL_MINI_MOCKS_KEY);
    const idx = localAll.findIndex((item) => item.id === record.id);
    if (idx >= 0) localAll[idx] = record;
    else localAll.unshift(record);
    writeLocalList(LOCAL_MINI_MOCKS_KEY, localAll);

    if (record.is_public) {
      const pubCache = readLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY).filter((m) => m.id !== record.id);
      writeLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY, [record, ...pubCache]);
    } else {
      const pubCache = readLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY).filter((m) => m.id !== record.id);
      writeLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY, pubCache);
    }

    if (supabase && userId && userId !== "local_user") {
      try {
        await supabase.from("personal_mini_mocks").upsert(
          {
            id: record.id,
            user_id: record.user_id,
            user_email: record.user_email,
            full_name: record.full_name,
            title: record.title,
            description: record.description,
            question_ids: record.question_ids,
            questions_snapshot: record.questions_snapshot,
            timed: record.timed,
            duration_minutes: record.duration_minutes,
            shuffle_questions: record.shuffle_questions,
            is_public: record.is_public,
            attempt_count: record.attempt_count,
            shared_at: record.shared_at,
            created_at: record.created_at,
            updated_at: record.updated_at,
          },
          { onConflict: "id" }
        );
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to sync mini mock to Supabase:", e);
        }
      }
    }

    return record;
  },

  async deleteMiniMock(id: string): Promise<void> {
    writeLocalList(
      LOCAL_MINI_MOCKS_KEY,
      readLocalList(LOCAL_MINI_MOCKS_KEY).filter((m) => m.id !== id)
    );
    writeLocalList(
      PUBLIC_MINI_MOCKS_CACHE_KEY,
      readLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY).filter((m) => m.id !== id)
    );

    if (supabase) {
      try {
        await supabase.from("personal_mini_mocks").delete().eq("id", id);
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to delete mini mock from Supabase:", e);
        }
      }
    }
  },

  async togglePublicShare(
    miniMock: PersonalMiniMock,
    nextPublic: boolean,
    userId: string,
    userEmail: string,
    fullName: string
  ): Promise<PersonalMiniMock> {
    const now = new Date().toISOString();
    return this.saveMiniMock(
      {
        ...miniMock,
        is_public: nextPublic,
        shared_at: nextPublic ? (miniMock.shared_at || now) : null,
      },
      userId,
      userEmail,
      fullName
    );
  },

  async recordAttempt(miniMock: PersonalMiniMock): Promise<void> {
    const nextCount = (miniMock.attempt_count || 0) + 1;
    const localAll = readLocalList(LOCAL_MINI_MOCKS_KEY).map((m) =>
      m.id === miniMock.id ? { ...m, attempt_count: nextCount } : m
    );
    writeLocalList(LOCAL_MINI_MOCKS_KEY, localAll);

    const pubCache = readLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY).map((m) =>
      m.id === miniMock.id ? { ...m, attempt_count: nextCount } : m
    );
    writeLocalList(PUBLIC_MINI_MOCKS_CACHE_KEY, pubCache);

    if (supabase && miniMock.user_id !== "local_user") {
      try {
        await supabase.rpc("increment_mini_mock_attempts", { target_id: miniMock.id });
      } catch {
        // Fallback or ignore if RPC not yet installed
      }
    }
  },
};
