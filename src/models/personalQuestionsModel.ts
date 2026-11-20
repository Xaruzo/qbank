/**
 * Model for user's personal private questions and community-shared questions.
 * Allows users to create private questions, practice them privately, and instantly publish to public community bank with attribution.
 */
import { supabase, isNetworkOrFetchError } from '../utils/supabaseClient';

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
  shared_at?: string | null;
  created_at: string;
  updated_at: string;
}

const LOCAL_STORAGE_KEY = "cse-my-personal-questions-v1";

export const personalQuestionsModel = {
  async getMyQuestions(userId: string, userEmail: string): Promise<PersonalQuestion[]> {
    if (!userId && !userEmail) return [];

    let local: PersonalQuestion[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    } catch {
      local = [];
    }

    if (supabase) {
      try {
        let query = supabase.from('personal_questions').select('*');
        if (userId) {
          query = query.or(`user_id.eq.${userId},user_email.eq.${userEmail || ''}`);
        } else if (userEmail) {
          query = query.eq('user_email', userEmail);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          // Merge remote and local
          const remoteMap = new Map(data.map((q: any) => [q.id, q]));
          const merged = [...data];
          for (const lq of local) {
            if (!remoteMap.has(lq.id)) {
              merged.push(lq);
            }
          }
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to fetch personal questions from Supabase:", e);
        }
      }
    }

    // Filter local for current user
    return local.filter((q) => q.user_id === userId || q.user_email === userEmail);
  },

  async savePersonalQuestion(q: Partial<PersonalQuestion>, userId: string, userEmail: string, fullName: string): Promise<PersonalQuestion> {
    const now = new Date().toISOString();
    const id = q.id || `pq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const record: PersonalQuestion = {
      id,
      user_id: userId || 'local_user',
      user_email: userEmail || 'user@example.com',
      full_name: fullName || 'User',
      topic: q.topic || 'numerical',
      question: q.question || '',
      choices: Array.isArray(q.choices) ? q.choices : ['', '', '', ''],
      correct: typeof q.correct === 'number' ? q.correct : 0,
      solution: q.solution || '',
      label: q.label || '',
      is_public: !!q.is_public,
      shared_at: q.is_public ? (q.shared_at || now) : null,
      created_at: q.created_at || now,
      updated_at: now,
    };

    // Save locally first
    let local: PersonalQuestion[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    } catch {
      local = [];
    }
    const idx = local.findIndex((item) => item.id === id);
    if (idx >= 0) {
      local[idx] = record;
    } else {
      local.unshift(record);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));

    // Save to Supabase if available
    if (supabase) {
      try {
        await supabase.from('personal_questions').upsert({
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
          shared_at: record.shared_at,
          created_at: record.created_at,
          updated_at: record.updated_at,
        }, { onConflict: 'id' });

        // If published public, also upsert into public questions pool so community can see it
        if (record.is_public) {
          await supabase.from('questions').upsert({
            id: `comm_${record.id}`,
            topic: record.topic,
            label: record.label ? `${record.label} (Shared by ${record.full_name})` : `Shared by ${record.full_name}`,
            question: record.question,
            choices: record.choices,
            correct: record.correct,
            solution: record.solution ? `${record.solution}\n\nContributed by: ${record.full_name} (${record.user_email})` : `Contributed by: ${record.full_name}`,
            created_at: record.created_at,
            updated_at: record.updated_at,
          }, { onConflict: 'id' });
        }
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to sync personal question to Supabase:", e);
        }
      }
    }

    return record;
  },

  async deletePersonalQuestion(id: string): Promise<void> {
    let local: PersonalQuestion[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    } catch {
      local = [];
    }
    local = local.filter((item) => item.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));

    if (supabase) {
      try {
        await supabase.from('personal_questions').delete().eq('id', id);
        await supabase.from('questions').delete().eq('id', `comm_${id}`);
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to delete personal question from Supabase:", e);
        }
      }
    }
  },

  async togglePublicShare(id: string, isPublic: boolean, userId: string, userEmail: string, fullName: string): Promise<PersonalQuestion | null> {
    let local: PersonalQuestion[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    } catch {
      local = [];
    }
    const idx = local.findIndex((item) => item.id === id);
    if (idx < 0) return null;

    const now = new Date().toISOString();
    local[idx].is_public = isPublic;
    local[idx].shared_at = isPublic ? now : null;
    local[idx].updated_at = now;
    const record = local[idx];

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));

    if (supabase) {
      try {
        await supabase.from('personal_questions').update({
          is_public: record.is_public,
          shared_at: record.shared_at,
          updated_at: record.updated_at,
        }).eq('id', id);

        if (isPublic) {
          await supabase.from('questions').upsert({
            id: `comm_${record.id}`,
            topic: record.topic,
            label: record.label ? `${record.label} (Shared by ${record.full_name})` : `Shared by ${record.full_name}`,
            question: record.question,
            choices: record.choices,
            correct: record.correct,
            solution: record.solution ? `${record.solution}\n\nContributed by: ${record.full_name}` : `Contributed by: ${record.full_name}`,
            created_at: record.created_at,
            updated_at: record.updated_at,
          }, { onConflict: 'id' });
        } else {
          await supabase.from('questions').delete().eq('id', `comm_${id}`);
        }
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          console.warn("Failed to update public share on Supabase:", e);
        }
      }
    }

    return record;
  }
};
