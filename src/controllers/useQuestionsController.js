import { useState, useEffect } from "react";
import { KEY, SAMPLES, TOPICS } from "../constants/appConstants";
import { storageModel } from "../models/storageModel";

export function useQuestionsController({ userId = null, authAvailable = false } = {}) {
  const [qs, setQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("favorites");
  const storageKey = userId ? `${KEY}:${userId}` : KEY;

  const getLabelValue = (q) => typeof q.label === "string" ? q.label.trim() : "";
  const normalizeTopic = (value) => {
    const topic = typeof value === "string" ? value : "general";
    return topic === "filipino" ? "verbal" : topic;
  };

  const normalizeQuestion = (q, favoriteIds = new Set()) => ({
    ...q,
    topic: normalizeTopic(q.topic),
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
    let active = true;
    const isActive = () => active;
    (async () => {
      setLoading(true);
      await init(isActive);
    })();
    return () => {
      active = false;
    };
  }, [storageKey, authAvailable]);

  useEffect(() => {
    const onOnline = () => {
      flushPendingUpserts();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  async function init(isActive) {
    try {
      let r = await storageModel.get(storageKey, { userId });
      const favoriteIds = new Set(await storageModel.getFavoriteIds(userId));
      let parsed = [];
      let didMigrateLegacy = false;

      if (r) {
        parsed = JSON.parse(r);
      } else {
        parsed = [];
      }

      if (userId && parsed.length === 0) {
        const legacy = await storageModel.get(KEY);
        if (legacy) {
          try {
            const legacyParsed = JSON.parse(legacy);
            if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
              parsed = legacyParsed;
              didMigrateLegacy = true;
            }
          } catch {}
        }
      }

      if (parsed.length > 0) {
        const normalized = parsed.map((q) => normalizeQuestion(q, favoriteIds));
        if (isActive()) setQs(normalized);
        await storageModel.set(storageKey, JSON.stringify(normalized));
        await storageModel.setFavoriteIds(
          normalized.filter((q) => q.favorite).map((q) => q.id),
          userId
        );
        if (didMigrateLegacy && userId && authAvailable) {
          for (const q of normalized) await storageModel.enqueuePendingUpsert(q, userId);
        }
      } else {
        const initial = SAMPLES.map((q) => normalizeQuestion(q, favoriteIds));
        if (isActive()) setQs(initial);
        await storageModel.set(storageKey, JSON.stringify(initial));
        await storageModel.setFavoriteIds(
          initial.filter((q) => q.favorite).map((q) => q.id),
          userId
        );
      }
    } catch (e) {
      console.error("Failed to init questions:", e);
      if (isActive()) setQs(SAMPLES);
    }
    if (isActive()) setLoading(false);
    flushPendingUpserts();
  }

  async function persist(next) {
    try {
      await storageModel.set(storageKey, JSON.stringify(next));
      await storageModel.setFavoriteIds(next.filter((q) => q.favorite).map((q) => q.id), userId);
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
      pending = await storageModel.listPendingUpserts(userId);
    } catch {
      pending = [];
    }
    try {
      remoteDeleted = new Set(await storageModel.getRemoteDeletedIds(userId));
    } catch {
      remoteDeleted = new Set();
    }

    for (const q of pending) {
      if (!q || !q.id) continue;
      if (remoteDeleted.has(q.id)) {
        try {
          await storageModel.dequeuePendingUpsert(q.id, userId);
        } catch {}
        continue;
      }
      try {
        await storageModel.syncQuestion(q, userId);
        await storageModel.dequeuePendingUpsert(q.id, userId);
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
      await storageModel.syncQuestion(q, userId);
      await storageModel.dequeuePendingUpsert(q.id, userId);
    } catch (e) {
      console.warn("Remote sync failed, will only save locally:", e);
      await storageModel.enqueuePendingUpsert(q, userId);
    }

    await persist(nextQs);
    return q;
  };

  const deleteQuestion = async (id) => {
    await storageModel.delete(id, userId);
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
