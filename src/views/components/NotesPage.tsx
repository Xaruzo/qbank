import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Copy,
  CopyPlus,
  Download,
  Check,
  Tag,
  BookOpen,
  ArrowLeft,
  Clock,
  History,
  ArrowDownAZ,
  ArrowUpZA,
  CheckSquare,
  X,
  ArrowUpDown,
  MoreVertical,
  RotateCcw,
} from "lucide-react";
import { notesModel } from "../../models/notesModel";
import { NOTE_TOPICS } from "../../constants/appConstants";
import type { StudyNote, TopicId, SelectOption } from "../../types";
import NoteRichEditor from "./NoteRichEditor";
import CustomSelect from "./CustomSelect";
import {
  stripNoteFormattingForSnippet,
  markdownToPlainText,
} from "../../utils/noteRichFormat";

type NoteColorId = StudyNote["color"];

const SORT_OPTIONS: SelectOption[] = [
  {
    value: "newest",
    label: "Newest",
    icon: (
      <Clock
        size={13}
        className="qb-sort-icon qb-sort-icon-newest"
        style={{ color: "#38bdf8" }}
        data-colored="true"
      />
    ),
  },
  {
    value: "oldest",
    label: "Oldest",
    icon: (
      <History
        size={13}
        className="qb-sort-icon qb-sort-icon-oldest"
        style={{ color: "#a78bfa" }}
        data-colored="true"
      />
    ),
  },
  {
    value: "title-az",
    label: "A - Z",
    icon: (
      <ArrowDownAZ
        size={13}
        className="qb-sort-icon qb-sort-icon-label-a-z"
        style={{ color: "#34d399" }}
        data-colored="true"
      />
    ),
  },
  {
    value: "title-za",
    label: "Z - A",
    icon: (
      <ArrowUpZA
        size={13}
        className="qb-sort-icon qb-sort-icon-label-z-a"
        style={{ color: "#2dd4bf" }}
        data-colored="true"
      />
    ),
  },
];

const TOPIC_SELECT_OPTIONS = NOTE_TOPICS.filter((t) => t.id !== "all").map((topic) => ({
  value: topic.id,
  label: topic.label,
}));


const SUGGESTED_TAGS = [
  "RA 6713",
  "Phil. Constitution",
  "Math Formulas",
  "Grammar Rules",
  "Alphabetical Filing",
  "Exam Checklist",
  "Shortcuts",
  "Need to Review",
];


export interface NotesPageProps {
  userId: string | null;
  onBack?: () => void;
  initialNoteId?: string | null;
}

export default function NotesPage({ userId, initialNoteId = null }: NotesPageProps) {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [activeTag, setActiveTag] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title-az" | "title-za">("newest");

  // Selected note for editing/viewing
  const [activeNote, setActiveNote] = useState<StudyNote | null>(null);

  // Editor form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTopic, setEditTopic] = useState<TopicId>("general");
  const [editColor, setEditColor] = useState<NoteColorId>("default");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editPinned, setEditPinned] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagFocused, setTagFocused] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved">("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const statusClearTimerRef = useRef<number | null>(null);
  const listTrackRef = useRef<HTMLDivElement>(null);
  const listThumbRef = useRef<HTMLDivElement>(null);
  const richTrackRef = useRef<HTMLDivElement>(null);
  const richThumbRef = useRef<HTMLDivElement>(null);
  const scrollTimersRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap());
  const scrollRafRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap());

  const handleMobileOverlayScroll = useCallback(
    (
      el: HTMLElement,
      trackEl: HTMLDivElement | null,
      thumbEl: HTMLDivElement | null
    ) => {
      if (typeof window === "undefined" || window.innerWidth > 600) {
        trackEl?.classList.remove("is-scrolling");
        return;
      }
      if (!trackEl || !thumbEl) return;

      const prevRaf = scrollRafRef.current.get(el);
      if (prevRaf) window.cancelAnimationFrame(prevRaf);

      const rafId = window.requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll <= 2) {
          trackEl.classList.remove("is-scrolling");
          return;
        }
        const trackLen = Math.max(24, trackEl.clientHeight || clientHeight - 12);
        const thumbH = Math.max(28, Math.min(trackLen, Math.round((clientHeight / scrollHeight) * trackLen)));
        const thumbTop = Math.round((scrollTop / maxScroll) * Math.max(0, trackLen - thumbH));

        thumbEl.style.height = `${thumbH}px`;
        thumbEl.style.transform = `translate3d(0, ${thumbTop}px, 0)`;
        trackEl.classList.add("is-scrolling");

        const prevTimer = scrollTimersRef.current.get(trackEl);
        if (prevTimer) window.clearTimeout(prevTimer);
        const nextTimer = window.setTimeout(() => {
          trackEl.classList.remove("is-scrolling");
          scrollTimersRef.current.delete(trackEl);
        }, 900);
        scrollTimersRef.current.set(trackEl, nextTimer);
      });

      scrollRafRef.current.set(el, rafId);
    },
    []
  );

  const [isDesktopPane, setIsDesktopPane] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1025 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktopPane(window.innerWidth >= 1025);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDirty = useMemo(() => {
    if (!activeNote) return false;
    const origTags = Array.isArray(activeNote.tags) ? activeNote.tags : [];
    const tagsChanged =
      origTags.length !== editTags.length || origTags.some((t, i) => t !== editTags[i]);
    return (
      editTitle !== (activeNote.title || "") ||
      editContent !== (activeNote.content || "") ||
      editTopic !== (activeNote.topic || "general") ||
      editColor !== (activeNote.color || "default") ||
      editPinned !== Boolean(activeNote.pinned) ||
      tagsChanged
    );
  }, [activeNote, editTitle, editContent, editTopic, editColor, editPinned, editTags]);

  const persistCurrentDraft = useCallback(async () => {
    if (!activeNote) return null;
    if (!editTitle.trim() && !editContent.trim()) return null;

    setSaveStatus("saving");
    const payload = {
      id: activeNote.id || null,
      title: editTitle.trim() || "Untitled Note",
      content: editContent,
      topic: editTopic,
      color: editColor,
      tags: editTags,
      pinned: editPinned,
    };

    const saved = await notesModel.save(payload, userId);
    const updatedAll = await notesModel.getAll(userId);
    setNotes(updatedAll);
    setActiveNote((curr) => {
      if (!curr || curr.id !== activeNote.id) return curr;
      return saved;
    });
    setSaveStatus("saved");
    if (statusClearTimerRef.current) window.clearTimeout(statusClearTimerRef.current);
    statusClearTimerRef.current = window.setTimeout(() => setSaveStatus(""), 1800);
    return saved;
  }, [activeNote, editTitle, editContent, editTopic, editColor, editTags, editPinned, userId]);

  // Keep latest persist helper available for switching & silent unmount flush
  const latestFlushRef = useRef({ isDirty: false, persist: persistCurrentDraft });
  useEffect(() => {
    latestFlushRef.current = { isDirty, persist: persistCurrentDraft };
  }, [isDirty, persistCurrentDraft]);

  const unmountSaveRef = useRef<{
    shouldSave: boolean;
    payload: {
      id: string | null;
      title: string;
      content: string;
      topic: TopicId;
      color: NoteColorId;
      tags: string[];
      pinned: boolean;
    } | null;
    userId: string | null;
  }>({ shouldSave: false, payload: null, userId: null });

  useEffect(() => {
    unmountSaveRef.current = {
      shouldSave: Boolean(
        isDirty && activeNote && (editTitle.trim() || editContent.trim())
      ),
      payload: activeNote
        ? {
            id: activeNote.id || null,
            title: editTitle.trim() || "Untitled Note",
            content: editContent,
            topic: editTopic,
            color: editColor,
            tags: editTags,
            pinned: editPinned,
          }
        : null,
      userId,
    };
  }, [isDirty, activeNote, editTitle, editContent, editTopic, editColor, editTags, editPinned, userId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (statusClearTimerRef.current) window.clearTimeout(statusClearTimerRef.current);
      if (unmountSaveRef.current.shouldSave && unmountSaveRef.current.payload) {
        void notesModel.save(unmountSaveRef.current.payload, unmountSaveRef.current.userId);
      }
    };
  }, []);

  // Debounced autosave
  useEffect(() => {
    if (!isDirty) return;
    if (!activeNote?.id && !editTitle.trim() && !editContent.trim()) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void persistCurrentDraft();
    }, 750);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, activeNote?.id, editTitle, editContent, persistCurrentDraft]);

  const applyNoteToEditor = useCallback((note: StudyNote) => {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTopic(note.topic || "general");
    setEditColor(note.color || "default");
    setEditTags(Array.isArray(note.tags) ? [...note.tags] : []);
    setEditPinned(Boolean(note.pinned));
    setTagInput("");
    setMoreMenuOpen(false);
  }, []);

  const openNote = useCallback(
    async (note: StudyNote) => {
      if (activeNote && activeNote.id === note.id) return;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (latestFlushRef.current.isDirty) {
        await latestFlushRef.current.persist();
      }
      applyNoteToEditor(note);
    },
    [activeNote, applyNoteToEditor]
  );

  // Load notes on mount
  useEffect(() => {
    let active = true;
    notesModel.getAll(userId).then((items) => {
      if (!active) return;
      setNotes(items);
      setLoading(false);

      if (initialNoteId) {
        const target = items.find((n) => n.id === initialNoteId);
        if (target) {
          applyNoteToEditor(target);
          return;
        }
      }

      // On desktop master-detail, open the top note immediately so right pane isn't an empty void
      if (typeof window !== "undefined" && window.innerWidth >= 1025 && items.length > 0) {
        applyNoteToEditor(items[0]);
      }
    });
    return () => {
      active = false;
    };
  }, [userId, initialNoteId, applyNoteToEditor]);

  // Keep desktop right pane populated if user resizes from tablet/mobile into desktop
  useEffect(() => {
    if (isDesktopPane && !loading && !activeNote && notes.length > 0) {
      applyNoteToEditor(notes[0]);
    }
  }, [isDesktopPane, loading, activeNote, notes, applyNoteToEditor]);

  // Keyboard Cmd/Ctrl + S
  useEffect(() => {
    if (!activeNote) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        void persistCurrentDraft();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeNote, persistCurrentDraft]);

  // Close overflow menu on outside click or Escape
  useEffect(() => {
    if (!moreMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [moreMenuOpen]);

  // All unique tags across notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      if (Array.isArray(n.tags)) {
        n.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const tagFilterOptions: SelectOption[] = useMemo(
    () => [
      { value: "all", label: "All Tags" },
      ...allTags.map((tag) => ({ value: tag, label: `#${tag}` })),
    ],
    [allTags]
  );

  // Filtered & sorted notes
  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes
      .filter((note) => {
        const matchesTopic = selectedTopic === "all" || note.topic === selectedTopic;
        const matchesPinned = !pinnedOnly || note.pinned;
        const matchesTag =
          activeTag === "all" || (Array.isArray(note.tags) && note.tags.includes(activeTag));
        const matchesSearch =
          !query ||
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          (Array.isArray(note.tags) && note.tags.some((t) => t.toLowerCase().includes(query)));

        return matchesTopic && matchesPinned && matchesTag && matchesSearch;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        if (sortBy === "newest") {
          return Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt);
        }
        if (sortBy === "oldest") {
          return Date.parse(a.updatedAt || a.createdAt) - Date.parse(b.updatedAt || b.createdAt);
        }
        if (sortBy === "title-az") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "title-za") {
          return b.title.localeCompare(a.title);
        }
        return 0;
      });
  }, [notes, search, selectedTopic, pinnedOnly, activeTag, sortBy]);

  const pinnedCount = useMemo(() => notes.filter((n) => n.pinned).length, [notes]);
  const hasActiveFilters = Boolean(
    search.trim() || selectedTopic !== "all" || pinnedOnly || activeTag !== "all"
  );

  const resetFilters = () => {
    setSearch("");
    setSelectedTopic("all");
    setPinnedOnly(false);
    setActiveTag("all");
  };

  const startNewNote = async (presetTopic: TopicId = "general", presetTitle = "", presetContent = "") => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (latestFlushRef.current.isDirty) {
      await latestFlushRef.current.persist();
    }
    const fresh: StudyNote = {
      id: "",
      title: presetTitle,
      content: presetContent,
      topic: presetTopic,
      color: "default",
      tags: [],
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    applyNoteToEditor(fresh);
  };

  const handleCloseMobileEditor = async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (latestFlushRef.current.isDirty) {
      await latestFlushRef.current.persist();
    }
    setActiveNote(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await notesModel.delete(noteId, userId);
    const updatedAll = await notesModel.getAll(userId);
    setNotes(updatedAll);
    setDeleteConfirmId(null);
    setMoreMenuOpen(false);
    if (activeNote?.id === noteId) {
      if (typeof window !== "undefined" && window.innerWidth >= 1025 && updatedAll.length > 0) {
        applyNoteToEditor(updatedAll[0]);
      } else {
        setActiveNote(null);
      }
    }
  };

  const handleDuplicateNote = async () => {
    if (!activeNote) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (isDirty) {
      await persistCurrentDraft();
    }
    const duplicated = await notesModel.save(
      {
        title: `${editTitle.trim() || "Untitled Note"} (Copy)`,
        content: editContent,
        topic: editTopic,
        color: editColor,
        tags: [...editTags],
        pinned: false,
      },
      userId
    );
    const updatedAll = await notesModel.getAll(userId);
    setNotes(updatedAll);
    applyNoteToEditor(duplicated);
  };

  const handleTogglePin = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!noteId) {
      setEditPinned((prev) => !prev);
      return;
    }
    const updated = await notesModel.togglePin(noteId, userId);
    setNotes(updated);
    if (activeNote?.id === noteId) {
      const target = updated.find((n) => n.id === noteId);
      if (target) {
        setActiveNote(target);
        setEditPinned(target.pinned);
      }
    }
  };

  const handleCopyNote = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedNotice(true);
      setMoreMenuOpen(false);
      window.setTimeout(() => setCopiedNotice(false), 1800);
    });
  };

  const handleDownloadMarkdown = (note: { title: string; content: string }) => {
    const blob = new Blob([note.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMoreMenuOpen(false);
  };

  const handleExportAll = () => {
    if (notes.length === 0) return;
    const md = notesModel.exportMarkdown(notes);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cse_qbank_study_notes_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddTag = (tagToAdd?: string) => {
    const trimmed = (tagToAdd || tagInput).trim().replace(/^#+/, "");
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter((t) => t !== tagToRemove));
  };

  const wordCount = useMemo(() => {
    const plain = markdownToPlainText(editContent);
    return plain.trim() ? plain.trim().split(/\s+/).length : 0;
  }, [editContent]);
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="qb-notes-container">
      {/* Compact Single-Row Top Bar */}
      <header className="qb-notes-topbar">
        <div className="qb-notes-title-group">
          <h1 className="qb-notes-page-title">Study Notes</h1>
          <div className="qb-notes-page-meta tabular-nums">
            <span>{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
            {pinnedCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{pinnedCount} pinned</span>
              </>
            )}
          </div>
        </div>

        <div className="qb-notes-top-actions">
          <button
            type="button"
            className="qb-notes-btn qb-notes-export-btn"
            onClick={handleExportAll}
            disabled={notes.length === 0}
            title="Export all notes as Markdown"
          >
            <Download size={15} />
            <span className="qb-btn-label-desktop">Export</span>
          </button>
          <button
            type="button"
            className="qb-notes-btn qb-notes-new-btn"
            onClick={() =>
              void startNewNote((selectedTopic !== "all" ? selectedTopic : "general") as TopicId)
            }
          >
            <Plus size={16} />
            <span>New Note</span>
          </button>
        </div>
      </header>

      {/* Main Dual-Pane Workspace */}
      <div className={`qb-notes-workspace${activeNote ? " has-active-note" : ""}`}>
        {/* Left Sidebar: Search, Compact Filters, Scrollable Notes List */}
        <aside className="qb-notes-sidebar" aria-label="Study notes list">
          <div className="qb-notes-controls">
            <div className="qb-notes-search-row">
              <div className="qb-notes-search-wrap">
                <Search size={15} className="qb-notes-search-icon" />
                <input
                  type="text"
                  className="qb-notes-search-input"
                  placeholder="Search notes, tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="qb-notes-search-clear"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className={`qb-notes-filter-toggle${pinnedOnly ? " is-active" : ""}`}
                onClick={() => setPinnedOnly(!pinnedOnly)}
                aria-pressed={pinnedOnly}
                title={pinnedOnly ? "Show all notes" : "Show pinned notes only"}
              >
                <Pin size={13} />
                <span className="qb-notes-pin-label">Pinned</span>
              </button>
            </div>

            {/* Wrapped Subject Filter Strip */}
            <div className="qb-notes-topic-strip" role="tablist" aria-label="Filter notes by subject">
              {NOTE_TOPICS.map((topic) => {
                const isSelected = selectedTopic === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`qb-notes-topic-tab${isSelected ? " is-active" : ""}`}
                    onClick={() => setSelectedTopic(topic.id)}
                    title={topic.label}
                  >
                    {topic.color && topic.id !== "all" && (
                      <span
                        className="qb-notes-topic-dot"
                        style={{ backgroundColor: topic.color }}
                      />
                    )}
                    <span>{topic.short || "All"}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-Filter Row: Sort & Tag Dropdowns with full legible labels */}
            <div className="qb-notes-subfilters">
              <div className="qb-notes-sort-select-wrap">
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val as typeof sortBy)}
                  options={SORT_OPTIONS}
                  leadIcon={<ArrowUpDown size={13} className="qb-notes-sort-icon" />}
                  className="qb-notes-sort-dropdown"
                  portal
                  minMenuWidth={170}
                />
              </div>

              {allTags.length > 0 && (
                <div className="qb-notes-tag-select-wrap">
                  <CustomSelect
                    value={activeTag}
                    onChange={setActiveTag}
                    options={tagFilterOptions}
                    leadIcon={<Tag size={12} />}
                    className="qb-notes-tag-dropdown"
                    portal
                    minMenuWidth={170}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes Feed */}
          <div className="qb-notes-list-shell">
            <div
              className="qb-notes-list"
              role="list"
              onScroll={(e) =>
                handleMobileOverlayScroll(e.currentTarget, listTrackRef.current, listThumbRef.current)
              }
            >
              {loading ? (
                <div className="qb-notes-loading" style={{ width: "100%", padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="qb-note-card qb-skel-card"
                      style={{ opacity: 1 - i * 0.18, pointerEvents: "none" }}
                    >
                      <div className="qb-note-card-head">
                        <div className="qb-skel-bar" style={{ width: "68%", height: 14, borderRadius: 6 }} />
                        <div className="qb-skel-bar" style={{ width: 16, height: 16, borderRadius: 4 }} />
                      </div>
                      <div className="qb-skel-bar" style={{ width: "92%", height: 12, borderRadius: 4, marginTop: 4 }} />
                      <div className="qb-skel-bar" style={{ width: "54%", height: 12, borderRadius: 4, marginTop: 2 }} />
                      <div className="qb-note-card-meta-line" style={{ marginTop: 6 }}>
                        <div className="qb-skel-bar" style={{ width: 48, height: 10, borderRadius: 4 }} />
                        <span aria-hidden="true">·</span>
                        <div className="qb-skel-bar" style={{ width: 60, height: 10, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredNotes.length === 0 ? (
              <div className="qb-notes-empty">
                <FileText size={32} className="qb-notes-empty-icon" />
                <h3>{hasActiveFilters ? "No matching notes" : "No study notes yet"}</h3>
                <p>
                  {hasActiveFilters
                    ? "Adjust your search, subject, or tag filter to see more notes."
                    : "Create concise study sheets, math formulas, or exam day checklists."}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="qb-notes-btn qb-notes-scratch-btn"
                    onClick={resetFilters}
                  >
                    <RotateCcw size={14} />
                    <span>Reset Filters</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="qb-notes-btn qb-notes-new-btn"
                    onClick={() =>
                      void startNewNote(
                        (selectedTopic !== "all" ? selectedTopic : "general") as TopicId
                      )
                    }
                  >
                    <Plus size={15} />
                    <span>Create Note</span>
                  </button>
                )}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                const topicDef = NOTE_TOPICS.find((t) => t.id === note.topic) || NOTE_TOPICS[1];
                const accentHex = topicDef.color;
                const updatedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" }
                );
                const snippet = stripNoteFormattingForSnippet(note.content);

                return (
                  <div
                    key={note.id}
                    role="button"
                    tabIndex={0}
                    className={`qb-note-card${isSelected ? " is-selected" : ""}${
                      note.pinned ? " is-pinned" : ""
                    }`}
                    onClick={() => void openNote(note)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void openNote(note);
                      }
                    }}
                    style={{ "--note-accent": accentHex } as React.CSSProperties}
                  >
                    <div className="qb-note-card-head">
                      <h4 className="qb-note-card-title">{note.title || "Untitled Note"}</h4>
                      <button
                        type="button"
                        className={`qb-note-action-btn${note.pinned ? " is-pinned" : ""}`}
                        onClick={(e) => void handleTogglePin(note.id, e)}
                        title={note.pinned ? "Unpin note" : "Pin note to top"}
                        aria-label={note.pinned ? "Unpin note" : "Pin note to top"}
                      >
                        <Pin size={13} />
                      </button>
                    </div>

                    <p className="qb-note-card-snippet">
                      {snippet || "Empty note — tap to add content..."}
                    </p>

                    <div className="qb-note-card-meta-line">
                      <span
                        className="qb-note-topic-label"
                        style={{ color: topicDef.color }}
                      >
                        {topicDef.short || topicDef.label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="qb-note-date tabular-nums">{updatedDate}</span>
                      {Array.isArray(note.tags) && note.tags.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="qb-note-card-inline-tags">
                            {note.tags.slice(0, 2).map((t) => `#${t}`).join(" ")}
                            {note.tags.length > 2 ? ` +${note.tags.length - 2}` : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            </div>
            <div ref={listTrackRef} className="qb-mobile-scroll-track" aria-hidden="true">
              <div ref={listThumbRef} className="qb-mobile-scroll-thumb" />
            </div>
          </div>
        </aside>

        {/* Right Main Pane: Reader & Markdown/Math Editor */}
        <section className="qb-notes-main" aria-label="Note workspace">
          {activeNote ? (
            <div className="qb-notes-editor-pane">
              {/* Top Editor Bar */}
              <div className="qb-note-editor-bar">
                <div className="qb-note-editor-left">
                  <button
                    type="button"
                    className="qb-note-mobile-close"
                    onClick={() => void handleCloseMobileEditor()}
                    title="Back to notes list"
                  >
                    <ArrowLeft size={15} />
                    <span>Notes</span>
                  </button>

                  <div className="qb-note-topic-select-wrap qb-note-topic-desktop">
                    <CustomSelect
                      value={editTopic}
                      onChange={(val) => setEditTopic(val as TopicId)}
                      options={TOPIC_SELECT_OPTIONS}
                      className="qb-note-topic-dropdown"
                      portal
                      minMenuWidth={185}
                    />
                  </div>
                </div>

                <div className="qb-note-editor-right">
                  {saveStatus === "saving" && (
                    <span className="qb-note-status-text is-saving">Saving...</span>
                  )}
                  {saveStatus === "saved" && !isDirty && (
                    <span className="qb-note-status-text is-saved">
                      <Check size={13} /> Saved
                    </span>
                  )}
                  {copiedNotice && (
                    <span className="qb-note-status-text is-saved">
                      <Check size={13} /> Copied
                    </span>
                  )}

                  <button
                    type="button"
                    className={`qb-note-tool-btn${editPinned ? " is-active" : ""}`}
                    onClick={() => void handleTogglePin(activeNote.id)}
                    title={editPinned ? "Unpin note" : "Pin note"}
                    aria-label={editPinned ? "Unpin note" : "Pin note"}
                    aria-pressed={editPinned}
                  >
                    <Pin size={15} />
                  </button>

                  {/* Kebab Overflow Actions Menu */}
                  <div className="qb-note-more-wrap" ref={moreMenuRef}>
                    <button
                      type="button"
                      className={`qb-note-tool-btn${moreMenuOpen ? " is-active" : ""}`}
                      onClick={() => setMoreMenuOpen((prev) => !prev)}
                      aria-expanded={moreMenuOpen}
                      aria-label="More note actions"
                      title="More actions"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {moreMenuOpen && (
                      <div className="qb-note-more-menu" role="menu">
                        <button
                          type="button"
                          className="qb-note-more-item"
                          onClick={() => handleCopyNote(markdownToPlainText(editContent))}
                        >
                          <Copy size={14} />
                          <span>Copy Text</span>
                        </button>
                        <button
                          type="button"
                          className="qb-note-more-item"
                          onClick={() => handleCopyNote(editContent)}
                        >
                          <Copy size={14} />
                          <span>Copy Markdown</span>
                        </button>
                        <button
                          type="button"
                          className="qb-note-more-item"
                          onClick={() => void handleDuplicateNote()}
                        >
                          <CopyPlus size={14} />
                          <span>Duplicate Note</span>
                        </button>
                        <button
                          type="button"
                          className="qb-note-more-item"
                          onClick={() =>
                            handleDownloadMarkdown({ title: editTitle, content: editContent })
                          }
                        >
                          <Download size={14} />
                          <span>Download (.md)</span>
                        </button>
                        {activeNote.id && (
                          <>
                            <div className="qb-note-more-divider" />
                            <button
                              type="button"
                              className="qb-note-more-item is-danger"
                              onClick={() => {
                                setMoreMenuOpen(false);
                                setDeleteConfirmId(activeNote.id);
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete Note</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`qb-notes-btn qb-notes-save-btn${isDirty ? " is-dirty" : ""}`}
                    onClick={() => void persistCurrentDraft()}
                    disabled={!editTitle.trim() && !editContent.trim()}
                    title="Save note (Ctrl/Cmd + S)"
                  >
                    <Check size={15} />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              {/* Document Title, Mobile Topic Selector & Compact Inline Tags */}
              <div className="qb-note-doc-header">
                <div className="qb-note-topic-mobile-row">
                  <CustomSelect
                    value={editTopic}
                    onChange={(val) => setEditTopic(val as TopicId)}
                    options={TOPIC_SELECT_OPTIONS}
                    className="qb-note-topic-dropdown"
                    portal
                    minMenuWidth={185}
                  />
                </div>

                <input
                  type="text"
                  className="qb-note-title-input"
                  placeholder="Note title..."
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />

                <div className="qb-note-tags-inline">
                  {editTags.map((t) => (
                    <span key={t} className="qb-note-tag-chip">
                      #{t}
                      <button
                        type="button"
                        className="qb-note-tag-del"
                        onClick={() => handleRemoveTag(t)}
                        aria-label={`Remove tag ${t}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="qb-note-tag-input-wrap">
                    <Tag size={12} className="qb-note-tag-icon" />
                    <input
                      type="text"
                      className="qb-note-tag-input"
                      placeholder="Add tag..."
                      value={tagInput}
                      onFocus={() => setTagFocused(true)}
                      onBlur={() => setTagFocused(false)}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                  </div>
                </div>

                {tagFocused && (
                  <div className="qb-note-suggested-tags">
                    <span className="qb-note-suggested-title">Quick tags:</span>
                    {SUGGESTED_TAGS.filter((t) => !editTags.includes(t))
                      .slice(0, 5)
                      .map((t) => (
                        <button
                          key={t}
                          type="button"
                          className="qb-note-suggested-tag-btn"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAddTag(t);
                          }}
                        >
                          +{t}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Unified Word / Apple Notes-Style Rich Text Document Area */}
              <div className="qb-note-rich-area">
                <NoteRichEditor
                  noteKey={activeNote.id || "new-note"}
                  markdown={editContent}
                  onChangeMarkdown={setEditContent}
                  onScroll={(el) =>
                    handleMobileOverlayScroll(el, richTrackRef.current, richThumbRef.current)
                  }
                />
                <div ref={richTrackRef} className="qb-mobile-scroll-track" aria-hidden="true">
                  <div ref={richThumbRef} className="qb-mobile-scroll-thumb" />
                </div>
              </div>

              {/* Minimal Quiet Footer */}
              <div className="qb-note-editor-footer">
                <span className="qb-note-stats-text tabular-nums">
                  {wordCount} {wordCount === 1 ? "word" : "words"} · {readMinutes} min read
                </span>
                <span className="qb-note-math-hint">
                  Rich text, checklists & equations · Autosaves automatically
                </span>
              </div>
            </div>
          ) : (
            <div className="qb-notes-no-selection">
              <div className="qb-notes-no-sel-card">
                <div className="qb-notes-no-sel-icon-wrap">
                  <BookOpen size={30} />
                </div>
                <h2>Select a Note or Start Writing</h2>
                <p>
                  Organize formulas, RA 6713 summaries, grammar rules, and exam checklists in one
                  workspace.
                </p>
                <div className="qb-notes-no-sel-actions">
                  <button
                    type="button"
                    className="qb-notes-btn qb-notes-new-btn"
                    onClick={() => void startNewNote("general")}
                  >
                    <Plus size={16} />
                    <span>New Blank Note</span>
                  </button>
                  <button
                    type="button"
                    className="qb-notes-btn qb-notes-scratch-btn"
                    onClick={() =>
                      void startNewNote(
                        "strategy",
                        "Exam Day Reminders & Checklist",
                        "### Priority Topics to Review\n- [ ] Philippine Constitution Executive & Legislative powers\n- [ ] Ratio & Proportion shortcuts\n- [ ] Alphabetical filing prefixes\n- [ ] RA 6713 Norms of Conduct"
                      )
                    }
                  >
                    <CheckSquare size={15} />
                    <span>Checklist Template</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="qb-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div
            className="qb-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="del-modal-title" className="qb-modal-title">
              Delete this note?
            </h3>
            <p className="qb-modal-text">
              Are you sure you want to delete this study note? This action cannot be undone.
            </p>
            <div className="qb-modal-actions">
              <button
                type="button"
                className="qb-modal-btn qb-modal-btn-cancel"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="qb-modal-btn qb-modal-btn-danger"
                onClick={() => void handleDeleteNote(deleteConfirmId)}
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
