import { useState, useEffect, useRef } from "react";
import { KEY, SAMPLES, TOPICS } from "../constants/appConstants";
import { storageModel } from "../models/storageModel";
import { supabase } from "../utils/supabaseClient";

export function useQuestionsController() {
  const [qs, setQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("favorites");

  const getLabelValue = (q) => typeof q.label === "string" ? q.label.trim() : "";

  const normalizeQuestion = (q, favoriteIds = new Set()) => ({
    ...q,
    question: typeof q.question === "string" ? q.question : "",
    choices: Array.isArray(q.choices) ? q.choices.map(choice => typeof choice === "string" ? choice : "") : [],
    label: getLabelValue(q),
    solution: typeof q.solution === "string" ? q.solution : "",
    favorite: favoriteIds.has(q.id) || !!q.favorite,
  });

  const getSortTimestamp = ({ q, index }) => {
    const directTime = Date.parse(q.dateAdded || "");
    if (Number.isFinite(directTime)) return directTime;
    const idTime = Number(q.id);
    if (Number.isFinite(idTime)) return idTime;
    return index;
  };

  const compareByLabel = (a, b, direction = "asc") => {
    const left = getLabelValue(a.q).toLowerCase();
    const right = getLabelValue(b.q).toLowerCase();

    if (!left && !right) return a.q.question.localeCompare(b.q.question) || a.index - b.index;
    if (!left) return 1;
    if (!right) return -1;

    const comparison = left.localeCompare(right);
    if (comparison !== 0) return direction === "asc" ? comparison : -comparison;

    return a.q.question.localeCompare(b.q.question) || a.index - b.index;
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const onOnline = () => {
      flushPendingUpserts();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // Real-time subscription to questions table
  useEffect(() => {
    if (!supabase) {
      console.log("Supabase not available, skipping realtime subscription");
      return;
    }

    console.log("Setting up realtime subscription for questions...");

    const channel = supabase
      .channel("public:questions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions" },
        async (payload) => {
          console.log("✅ Realtime update received:", payload);
          console.log("Event type:", payload.eventType);
          // Refresh questions from Supabase
          await init();
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      console.log("Removing realtime channel...");
      supabase.removeChannel(channel);
    };
  }, []);

  async function init() {
    try {
      const r = await storageModel.get(KEY);
      const favoriteIds = new Set(await storageModel.getFavoriteIds());
      if (r) {
        const parsed = JSON.parse(r);
        const normalized = parsed.map(q => normalizeQuestion(q, favoriteIds));
        setQs(normalized);
        await storageModel.set(KEY, JSON.stringify(normalized));
        await storageModel.setFavoriteIds(normalized.filter(q => q.favorite).map(q => q.id));
      } else {
        const initial = SAMPLES.map(q => normalizeQuestion(q, favoriteIds));
        setQs(initial);
        await storageModel.set(KEY, JSON.stringify(initial));
        await storageModel.setFavoriteIds(initial.filter(q => q.favorite).map(q => q.id));
      }
    } catch (e) {
      console.error("Failed to init questions:", e);
      setQs(SAMPLES);
    }
    setLoading(false);
    flushPendingUpserts();
  }

  async function persist(next) {
    try {
      await storageModel.set(KEY, JSON.stringify(next));
      await storageModel.setFavoriteIds(next.filter(q => q.favorite).map(q => q.id));
    } catch (e) {
      console.error("Failed to persist questions:", e);
    }
    setQs(next);
  }

  async function flushPendingUpserts() {
    if (!navigator.onLine) return;
    let pending = [];
    let remoteDeleted = new Set();
    try {
      pending = await storageModel.listPendingUpserts();
    } catch {
      pending = [];
    }
    try {
      remoteDeleted = new Set(await storageModel.getRemoteDeletedIds());
    } catch {
      remoteDeleted = new Set();
    }

    for (const q of pending) {
      if (!q || !q.id) continue;
      if (remoteDeleted.has(q.id)) {
        try {
          await storageModel.dequeuePendingUpsert(q.id);
        } catch {}
        continue;
      }
      try {
        await storageModel.syncQuestion(q);
        await storageModel.dequeuePendingUpsert(q.id);
      } catch {}
    }
  }

  const saveQuestion = async (form, editId) => {
    const previous = editId ? qs.find(x => x.id === editId) : null;
    const q = {
      id: editId || Date.now().toString(),
      ...form,
      dateAdded: previous?.dateAdded || new Date().toISOString(),
      favorite: previous?.favorite || false,
    };
    const nextQs = editId ? qs.map(x => x.id === editId ? q : x) : [...qs, q];
    
    // First, sync to remote database if available
    try {
      await storageModel.syncQuestion(q);
      await storageModel.dequeuePendingUpsert(q.id);
    } catch (e) {
      console.warn("Remote sync failed, will only save locally:", e);
      await storageModel.enqueuePendingUpsert(q);
    }

    await persist(nextQs);
    return q;
  };

  const deleteQuestion = async (id) => {
    await storageModel.delete(id);
    const nextQs = qs.filter(q => q.id !== id);
    await persist(nextQs);
  };

  const toggleFavorite = async (id) => {
    const nextQs = qs.map(q => (
      q.id === id ? { ...q, favorite: !q.favorite } : q
    ));
    await persist(nextQs);
  };

  const counts = TOPICS.reduce((a, t) => ({
    ...a,
    [t.id]: qs.filter(q => q.topic === t.id).length
  }), {});

  const labelCounts = qs.reduce((acc, q) => {
    const label = getLabelValue(q);
    if (!label) return acc;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const labelOptions = Object.keys(labelCounts)
    .sort((a, b) => a.localeCompare(b))
    .map(label => ({
      value: label,
      label,
      count: labelCounts[label],
    }));

  const filteredQuestions = qs
    .map((q, index) => ({ q, index }))
    .filter(({ q }) => {
      const matchesTopic = topicFilter === "all" || q.topic === topicFilter;
      const matchesLabel = labelFilter === "all" || getLabelValue(q) === labelFilter;
      const matchesSearch = !search || [q.question, q.label, ...q.choices, q.solution].some(s =>
        s.toLowerCase().includes(search.toLowerCase())
      );
      return matchesTopic && matchesLabel && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return getSortTimestamp(b) - getSortTimestamp(a) || b.index - a.index;
      if (sortBy === "oldest") return getSortTimestamp(a) - getSortTimestamp(b) || a.index - b.index;
      if (sortBy === "a-z") return a.q.question.localeCompare(b.q.question) || a.index - b.index;
      if (sortBy === "z-a") return b.q.question.localeCompare(a.q.question) || a.index - b.index;
      if (sortBy === "label-a-z") return compareByLabel(a, b, "asc");
      if (sortBy === "label-z-a") return compareByLabel(a, b, "desc");
      return Number(b.q.favorite) - Number(a.q.favorite) || a.index - b.index;
    })
    .map(({ q }) => q);

  return {
    qs,
    loading,
    search,
    setSearch,
    topicFilter,
    setTopicFilter,
    labelFilter,
    setLabelFilter,
    sortBy,
    setSortBy,
    saveQuestion,
    deleteQuestion,
    toggleFavorite,
    counts,
    labelOptions,
    filteredQuestions,
  };
}
