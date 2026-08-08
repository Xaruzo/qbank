import { useState, useEffect, useRef } from "react";
import { KEY, SAMPLES, TOPICS } from "../constants/appConstants";
import { storageModel } from "../models/storageModel";
import { favoritesModel } from "../models/favoritesModel";
import { supabase } from "../utils/supabaseClient";

export function useQuestionsController(userId = null, isAuthLoading = false) {
  const [qs, setQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("favorites");
  const initRequestRef = useRef(0);

  const getLabelValue = (q) => typeof q.label === "string" ? q.label.trim() : "";

  const normalizeQuestion = (q, favoriteIds = new Set()) => ({
    ...q,
    question: typeof q.question === "string" ? q.question : "",
    choices: Array.isArray(q.choices) ? q.choices.map(choice => typeof choice === "string" ? choice : "") : [],
    label: getLabelValue(q),
    solution: typeof q.solution === "string" ? q.solution : "",
    favorite: favoriteIds.has(q.id),
  });

  const normalizeQuestions = (items, favoriteIds = new Set()) => (
    Array.isArray(items) ? items.map((q) => normalizeQuestion(q, favoriteIds)) : []
  );

  const parseQuestionsValue = (raw, favoriteIds = new Set()) => {
    try {
      const parsed = JSON.parse(raw);
      return normalizeQuestions(parsed, favoriteIds);
    } catch {
      return [];
    }
  };

  const persistQuestionsCache = (next) => {
    storageModel.set(KEY, JSON.stringify(next)).catch(() => {});
  };

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
    if (isAuthLoading) return;
    init();
  }, [userId, isAuthLoading]);

  useEffect(() => {
    const onOnline = () => {
      init();
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
    const requestId = initRequestRef.current + 1;
    initRequestRef.current = requestId;
    let renderedInitialState = false;

    try {
      const [cachedQuestionsValue, cachedFavoriteIds] = await Promise.all([
        storageModel.getLocal(KEY),
        favoritesModel.getCachedAll(userId),
      ]);

      if (initRequestRef.current !== requestId) return;

      const cachedFavoriteSet = new Set(cachedFavoriteIds);

      if (cachedQuestionsValue !== null) {
        const normalized = parseQuestionsValue(cachedQuestionsValue, cachedFavoriteSet);
        setQs(normalized);
        setLoading(false);
        renderedInitialState = true;
      } else if (!supabase) {
        const initial = normalizeQuestions(SAMPLES, cachedFavoriteSet);
        setQs(initial);
        setLoading(false);
        renderedInitialState = true;
        persistQuestionsCache(initial);
      }
    } catch (e) {
      console.error("Failed to init questions:", e);
      setQs(normalizeQuestions(SAMPLES));
      setLoading(false);
      renderedInitialState = true;
    }

    if (userId) setFavoritesLoading(true);
    else setFavoritesLoading(false);

    const canReachNetwork =
      !!supabase && (typeof navigator === "undefined" || navigator.onLine !== false);
    const shouldFetchFreshQuestions = canReachNetwork;

    if (renderedInitialState && shouldFetchFreshQuestions) setRefreshing(true);

    void (async () => {
      try {
        const freshQuestionsValue = !shouldFetchFreshQuestions
          ? null
          : await storageModel.getFreshQuestions(true).catch((error) => {
              console.error("Failed to refresh questions:", error);
              return null;
            });

        if (initRequestRef.current !== requestId) return;

        const freshFavoriteIds = await favoritesModel.getAll(userId).catch((error) => {
          console.error("Failed to refresh favorites:", error);
          return null;
        });

        if (initRequestRef.current !== requestId) return;

        const favoriteIds = new Set(Array.isArray(freshFavoriteIds) ? freshFavoriteIds : []);

        if (freshQuestionsValue !== null) {
          const normalized = parseQuestionsValue(freshQuestionsValue, favoriteIds);
          setQs(normalized);
          setLoading(false);
          persistQuestionsCache(normalized);
        } else if (!renderedInitialState) {
          const fallback = normalizeQuestions(SAMPLES, favoriteIds);
          setQs(fallback);
          setLoading(false);
          persistQuestionsCache(fallback);
        } else {
          setQs((current) => current.map((q) => normalizeQuestion(q, favoriteIds)));
        }
      } finally {
        if (initRequestRef.current === requestId) {
          setFavoritesLoading(false);
          setRefreshing(false);
        }
      }
    })();

    void flushPendingUpserts();
  }

  async function persist(next) {
    try {
      await storageModel.set(KEY, JSON.stringify(next));
    } catch (_) {}
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

    for (const op of pending) {
      if (!op || !op.id) continue;
      if (remoteDeleted.has(op.id)) {
        try {
          await storageModel.dequeuePendingUpsert(op.id);
        } catch {}
        continue;
      }
      try {
        if (op.type === "delete") {
          await storageModel.syncQuestionDelete(op.id, op.deletedAt || op.updatedAt);
        } else if (op.question) {
          const result = await storageModel.syncQuestion(op.question);
          if (result?.status === "remote_deleted" || result?.status === "stale_remote") {
            await storageModel.dequeuePendingUpsert(op.id);
            continue;
          }
        }
        await storageModel.dequeuePendingUpsert(op.id);
      } catch {}
    }
  }

  const saveQuestion = async (form, editId) => {
    const previous = editId ? qs.find(x => x.id === editId) : null;
    const q = {
      id: editId || Date.now().toString(),
      ...form,
      dateAdded: previous?.dateAdded || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: previous?.favorite || false,
    };
    const nextQs = editId ? qs.map(x => x.id === editId ? q : x) : [...qs, q];
    
    // First, sync to remote database if available
    try {
      const result = await storageModel.syncQuestion(q);
      await storageModel.dequeuePendingUpsert(q.id);
      if (result?.status === "remote_deleted" || result?.status === "stale_remote") {
        await init();
        return null;
      }
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
    const question = qs.find(q => q.id === id);
    if (!question) return;
    const newState = !question.favorite;
    await favoritesModel.set(id, newState, userId);
    const nextQs = qs.map(q => (
      q.id === id ? { ...q, favorite: newState } : q
    ));
    await persist(nextQs);
  };

  async function refreshFavorites() {
    if (!userId) {
      setQs((current) => current.map((q) => ({ ...q, favorite: false })));
      return;
    }
    setFavoritesLoading(true);
    try {
      const favoriteIds = new Set(await favoritesModel.getAll(userId));
      setQs((current) => current.map((q) => normalizeQuestion(q, favoriteIds)));
    } catch (e) {
      console.error("Failed to refresh favorites:", e);
    } finally {
      setFavoritesLoading(false);
    }
  }

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
    refreshing,
    favoritesLoading,
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
