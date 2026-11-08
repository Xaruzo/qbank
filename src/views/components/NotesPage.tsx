import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Copy,
  Download,
  Check,
  Tag,
  BookOpen,
  Eye,
  Code,
  ArrowLeft,
  Clock,
  Sparkles,
  CheckSquare,
  List,
  Bold,
  Italic,
  Underline,
  Columns,
  X,
} from "lucide-react";
import { notesModel } from "../../models/notesModel";
import { NOTE_TOPICS } from "../../constants/appConstants";
import type { StudyNote, TopicId } from "../../types";
import MarkdownText from "./MarkdownText";
import CustomSelect from "./CustomSelect";

interface NoteColorOption {
  id: "default" | "amber" | "purple" | "blue" | "emerald" | "rose";
  label: string;
  hex: string;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Recently Updated" },
  { value: "oldest", label: "Oldest First" },
  { value: "title-az", label: "Title (A - Z)" },
  { value: "title-za", label: "Title (Z - A)" },
];

const TOPIC_SELECT_OPTIONS = NOTE_TOPICS.filter((t) => t.id !== "all").map((topic) => ({
  value: topic.id,
  label: topic.label,
}));

const NOTE_COLORS: NoteColorOption[] = [
  { id: "default", label: "Classic Slate", hex: "#64748b" },
  { id: "amber", label: "Amber Gold", hex: "#f59e0b" },
  { id: "purple", label: "Royal Purple", hex: "#a855f7" },
  { id: "blue", label: "Cyber Blue", hex: "#0ea5e9" },
  { id: "emerald", label: "Emerald Green", hex: "#10b981" },
  { id: "rose", label: "Rose Crimson", hex: "#f43f5e" },
];

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

export default function NotesPage({ userId, onBack, initialNoteId = null }: NotesPageProps) {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [activeTag, setActiveTag] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title-az" | "title-za">("newest");

  // Selected note for editing/viewing
  const [activeNote, setActiveNote] = useState<StudyNote | null>(null);
  const [editorMode, setEditorMode] = useState<"write" | "preview" | "split">("write");

  // Editor form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTopic, setEditTopic] = useState<TopicId>("general");
  const [editColor, setEditColor] = useState<NoteColorOption["id"]>("default");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editPinned, setEditPinned] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved">("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openNote = useCallback((note: StudyNote) => {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTopic(note.topic || "general");
    setEditColor(note.color || "default");
    setEditTags(Array.isArray(note.tags) ? [...note.tags] : []);
    setEditPinned(Boolean(note.pinned));
  }, []);

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
          openNote(target);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [userId, initialNoteId, openNote]);

  // All unique tags across notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      if (Array.isArray(n.tags)) {
        n.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet);
  }, [notes]);

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

  const startNewNote = (presetTopic: TopicId = "general") => {
    const fresh: StudyNote = {
      id: "",
      title: "",
      content: "",
      topic: presetTopic,
      color: "default",
      tags: [],
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveNote(fresh);
    setEditTitle("");
    setEditContent("");
    setEditTopic(presetTopic);
    setEditColor("default");
    setEditTags([]);
    setEditPinned(false);
    setEditorMode("write");
  };

  const handleSaveNote = async () => {
    if (!editTitle.trim() && !editContent.trim()) return;

    setSaveStatus("saving");
    const payload = {
      id: activeNote?.id || null,
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
    setActiveNote(saved);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(""), 2000);
  };

  const handleDeleteNote = async (noteId: string) => {
    await notesModel.delete(noteId, userId);
    const updatedAll = await notesModel.getAll(userId);
    setNotes(updatedAll);
    setDeleteConfirmId(null);
    if (activeNote?.id === noteId) {
      setActiveNote(null);
    }
  };

  const handleTogglePin = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleCopyNote = (content: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDownloadMarkdown = (note: { title: string; content: string }, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const blob = new Blob([note.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
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
    const trimmed = (tagToAdd || tagInput).trim();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter((t) => t !== tagToRemove));
  };

  const insertSyntax = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = editContent.substring(start, end);
    const replacement = prefix + (selection || "text") + suffix;

    const nextContent = editContent.substring(0, start) + replacement + editContent.substring(end);
    setEditContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selection.length || 4)
      );
    }, 0);
  };

  return (
    <div className="qb-notes-container">
      {/* Top Banner / Breadcrumb */}
      <div className="qb-notes-topbar">
        <div className="qb-notes-breadcrumb">
          {onBack && (
            <button
              type="button"
              className="qb-notes-back-btn"
              onClick={onBack}
              aria-label="Back to Question Bank"
            >
              <ArrowLeft size={16} />
              <span>Question Bank</span>
            </button>
          )}
          <div className="qb-notes-title-group">
            <h1 className="qb-notes-page-title">
              <BookOpen size={20} className="qb-notes-page-icon" />
              <span>Reviewer Study Notes</span>
            </h1>
            <p className="qb-notes-page-sub">
              Formulas, laws, memory mnemonics, and exam preparation checklists.
            </p>
          </div>
        </div>

        <div className="qb-notes-top-actions">
          <button
            type="button"
            className="qb-notes-btn qb-notes-export-btn"
            onClick={handleExportAll}
            title="Download all notes as a Markdown document"
          >
            <Download size={15} />
            <span className="qb-btn-label-desktop">Export (.md)</span>
          </button>
          <button
            type="button"
            className="qb-notes-btn qb-notes-new-btn"
            onClick={() => startNewNote((selectedTopic !== "all" ? selectedTopic : "general") as TopicId)}
          >
            <Plus size={16} />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Column Workspace */}
      <div className={`qb-notes-workspace${activeNote ? " has-active-note" : ""}`}>
        {/* Left Column: Filter Bar & Notes List */}
        <div className="qb-notes-sidebar">
          {/* Search and Filters */}
          <div className="qb-notes-controls">
            <div className="qb-notes-search-wrap">
              <Search size={16} className="qb-notes-search-icon" />
              <input
                type="text"
                className="qb-notes-search-input"
                placeholder="Search notes, formulas, tags..."
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
                  ×
                </button>
              )}
            </div>

            {/* Topic Filter Chips with clean scrollbar */}
            <div className="qb-notes-topic-chips" role="tablist" aria-label="Filter notes by topic">
              {NOTE_TOPICS.map((topic) => {
                const isSelected = selectedTopic === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    className={`qb-notes-topic-chip${isSelected ? " is-active" : ""}`}
                    onClick={() => setSelectedTopic(topic.id)}
                    style={
                      isSelected && topic.color
                        ? { borderColor: topic.color, color: topic.color }
                        : {}
                    }
                  >
                    {topic.short && (
                      <span
                        className="qb-notes-topic-dot"
                        style={{ backgroundColor: topic.color }}
                      />
                    )}
                    <span>{topic.short || topic.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-Filters: Pinned toggle & Modern Custom Dropdown */}
            <div className="qb-notes-subfilters">
              <button
                type="button"
                className={`qb-notes-filter-toggle${pinnedOnly ? " is-active" : ""}`}
                onClick={() => setPinnedOnly(!pinnedOnly)}
                title={pinnedOnly ? "Show all notes" : "Filter by pinned notes only"}
              >
                <Pin size={13} />
                <span>Pinned ({notes.filter((n) => n.pinned).length})</span>
              </button>

              <div className="qb-notes-sort-select-wrap">
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val as any)}
                  options={SORT_OPTIONS}
                  className="qb-notes-sort-dropdown"
                />
              </div>
            </div>

            {/* Tag Filter Section: non-cramped, smooth horizontal scroll, zero tag-pushing */}
            {allTags.length > 0 && (
              <div className="qb-notes-tags-section">
                <div className="qb-notes-tags-header">
                  <span>Filter by Tag</span>
                  {activeTag !== "all" && (
                    <button
                      type="button"
                      className="qb-notes-tag-clear"
                      onClick={() => setActiveTag("all")}
                      title="Clear active tag filter"
                    >
                      <X size={12} />
                      <span>Clear: #{activeTag}</span>
                    </button>
                  )}
                </div>
                <div className="qb-notes-tag-filter-row" aria-label="Filter notes by tag">
                  <button
                    type="button"
                    className={`qb-notes-tag-pill${activeTag === "all" ? " is-active" : ""}`}
                    onClick={() => setActiveTag("all")}
                  >
                    All Tags
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`qb-notes-tag-pill${activeTag === tag ? " is-active" : ""}`}
                      onClick={() => setActiveTag(activeTag === tag ? "all" : tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes List / Cards Grid */}
          <div className="qb-notes-list" role="list">
            {loading ? (
              <div className="qb-notes-loading">
                <div className="qb-notes-spinner" />
                <span>Loading notes...</span>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="qb-notes-empty">
                <FileText size={36} className="qb-notes-empty-icon" />
                <h3>No notes found</h3>
                <p>
                  {search || selectedTopic !== "all" || pinnedOnly || activeTag !== "all"
                    ? "Try adjusting your search query or tag filter."
                    : "No notes here yet. Create your first reviewer note to get started!"}
                </p>
                <button
                  type="button"
                  className="qb-notes-btn qb-notes-new-btn"
                  onClick={() => startNewNote((selectedTopic !== "all" ? selectedTopic : "general") as TopicId)}
                >
                  <Plus size={15} />
                  <span>Create Note</span>
                </button>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                const topicDef = NOTE_TOPICS.find((t) => t.id === note.topic) || NOTE_TOPICS[1];
                const colorDef = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
                const updatedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" }
                );

                return (
                  <div
                    key={note.id}
                    role="button"
                    tabIndex={0}
                    className={`qb-note-card${isSelected ? " is-selected" : ""}${
                      note.pinned ? " is-pinned" : ""
                    }`}
                    onClick={() => openNote(note)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openNote(note);
                      }
                    }}
                    style={{
                      "--note-accent": colorDef.hex !== "#64748b" ? colorDef.hex : topicDef.color,
                    } as React.CSSProperties}
                  >
                    <div className="qb-note-card-head">
                      <div className="qb-note-card-meta">
                        <span
                          className="qb-note-topic-badge"
                          style={{ color: topicDef.color }}
                        >
                          {topicDef.short || topicDef.label}
                        </span>
                        <span className="qb-note-date">
                          <Clock size={11} />
                          {updatedDate}
                        </span>
                      </div>

                      <div className="qb-note-card-actions">
                        <button
                          type="button"
                          className={`qb-note-action-btn${note.pinned ? " is-pinned" : ""}`}
                          onClick={(e) => handleTogglePin(note.id, e)}
                          title={note.pinned ? "Unpin note" : "Pin note to top"}
                          aria-label={note.pinned ? "Unpin note" : "Pin note to top"}
                        >
                          <Pin size={13} />
                        </button>
                      </div>
                    </div>

                    <h4 className="qb-note-card-title">{note.title || "Untitled Note"}</h4>

                    <p className="qb-note-card-snippet">
                      {note.content.replace(/[#*`$\-\\[\]]/g, "").slice(0, 110) || "No content..."}
                    </p>

                    {Array.isArray(note.tags) && note.tags.length > 0 && (
                      <div className="qb-note-card-tags">
                        {note.tags.slice(0, 3).map((t) => (
                          <span key={t} className="qb-note-mini-tag">
                            #{t}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="qb-note-mini-tag-more">+{note.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Note Viewer / Editor */}
        <div className="qb-notes-main">
          {activeNote ? (
            <div className="qb-notes-editor-pane">
              {/* Note Editor Header Bar */}
              <div className="qb-note-editor-bar">
                <div className="qb-note-editor-left">
                  <button
                    type="button"
                    className="qb-note-mobile-close"
                    onClick={() => setActiveNote(null)}
                    title="Return to notes list"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Notes</span>
                  </button>

                  <div className="qb-note-topic-select-wrap">
                    <CustomSelect
                      value={editTopic}
                      onChange={(val) => setEditTopic(val as TopicId)}
                      options={TOPIC_SELECT_OPTIONS}
                      className="qb-note-topic-dropdown"
                    />
                  </div>

                  {/* Accent Color Picker */}
                  <div className="qb-note-color-picker" title="Card accent theme">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`qb-note-color-dot${editColor === c.id ? " is-active" : ""}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => setEditColor(c.id)}
                        aria-label={c.label}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="qb-note-editor-right">
                  {saveStatus === "saved" && (
                    <span className="qb-note-saved-badge">
                      <Check size={13} /> Saved
                    </span>
                  )}
                  {saveStatus === "saving" && (
                    <span className="qb-note-saving-badge">Saving...</span>
                  )}

                  <button
                    type="button"
                    className={`qb-note-tool-btn${editPinned ? " is-active" : ""}`}
                    onClick={() => setEditPinned(!editPinned)}
                    title={editPinned ? "Unpin note" : "Pin note"}
                    aria-label="Pin note"
                  >
                    <Pin size={15} />
                  </button>

                  <button
                    type="button"
                    className="qb-note-tool-btn"
                    onClick={(e) => handleCopyNote(editContent, activeNote.id, e)}
                    title="Copy note content"
                    aria-label="Copy note content"
                  >
                    {copiedId === activeNote.id ? <Check size={15} /> : <Copy size={15} />}
                  </button>

                  <button
                    type="button"
                    className="qb-note-tool-btn"
                    onClick={(e) =>
                      handleDownloadMarkdown({ title: editTitle, content: editContent }, e)
                    }
                    title="Download this note as Markdown"
                    aria-label="Download note"
                  >
                    <Download size={15} />
                  </button>

                  {activeNote.id && (
                    <button
                      type="button"
                      className="qb-note-tool-btn qb-note-del-btn"
                      onClick={() => setDeleteConfirmId(activeNote.id)}
                      title="Delete note"
                      aria-label="Delete note"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="qb-notes-btn qb-notes-save-btn"
                    onClick={handleSaveNote}
                  >
                    <Check size={15} />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div className="qb-note-title-row">
                <input
                  type="text"
                  className="qb-note-title-input"
                  placeholder="Note Title (e.g., RA 6713 Norms of Conduct, Work Problem Shortcuts...)"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              {/* Tag Editor Row */}
              <div className="qb-note-tags-row">
                <div className="qb-note-tags-list">
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
                    <Tag size={13} className="qb-note-tag-icon" />
                    <input
                      type="text"
                      className="qb-note-tag-input"
                      placeholder="Add tag and press Enter..."
                      value={tagInput}
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

                {/* Suggested Tag Quick Clicks */}
                <div className="qb-note-suggested-tags">
                  <span className="qb-note-suggested-title">Suggestions:</span>
                  {SUGGESTED_TAGS.filter((t) => !editTags.includes(t))
                    .slice(0, 5)
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="qb-note-suggested-tag-btn"
                        onClick={() => handleAddTag(t)}
                      >
                        +{t}
                      </button>
                    ))}
                </div>
              </div>

              {/* Formatting & Math Toolbar */}
              <div className="qb-note-formatting-bar">
                <div className="qb-note-fmt-group">
                  <button
                    type="button"
                    className="qb-note-fmt-btn"
                    onClick={() => insertSyntax("**", "**")}
                    title="Bold (**text**)"
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    className="qb-note-fmt-btn"
                    onClick={() => insertSyntax("*", "*")}
                    title="Italic (*text*)"
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    type="button"
                    className="qb-note-fmt-btn"
                    onClick={() => insertSyntax("<u>", "</u>")}
                    title="Underline (<u>text</u>)"
                  >
                    <Underline size={14} />
                  </button>
                  <button
                    type="button"
                    className="qb-note-fmt-btn"
                    onClick={() => insertSyntax("### ")}
                    title="Heading (### Header)"
                  >
                    H3
                  </button>
                </div>

                <div className="qb-note-fmt-sep" />

                <div className="qb-note-fmt-group">
                  <button
                    type="button"
                    className="qb-note-fmt-btn"
                    onClick={() => insertSyntax("- ")}
                    title="Bullet list (- item)"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    className="qb-note-fmt-btn"
                    onClick={() => insertSyntax("- [ ] ")}
                    title="Task checkbox (- [ ] item)"
                  >
                    <CheckSquare size={14} />
                  </button>
                </div>

                <div className="qb-note-fmt-sep" />

                <div className="qb-note-fmt-group">
                  <button
                    type="button"
                    className="qb-note-fmt-btn qb-note-fmt-math"
                    onClick={() => insertSyntax("$", "$")}
                    title="Inline math ($formula$)"
                  >
                    $f(x)$
                  </button>
                  <button
                    type="button"
                    className="qb-note-fmt-btn qb-note-fmt-math"
                    onClick={() => insertSyntax("$$\n", "\n$$")}
                    title="Display math block ($$...$$)"
                  >
                    $$\Sigma$$
                  </button>
                  <button
                    type="button"
                    className="qb-note-fmt-btn qb-note-fmt-math"
                    onClick={() => insertSyntax("\\frac{a}{b}")}
                    title="Fraction (\\frac{a}{b})"
                  >
                    ½
                  </button>
                </div>

                {/* View Switcher: Write vs Preview vs Split */}
                <div className="qb-note-view-switcher">
                  <button
                    type="button"
                    className={`qb-note-view-tab${editorMode === "write" ? " is-active" : ""}`}
                    onClick={() => setEditorMode("write")}
                  >
                    <Code size={13} />
                    <span>Write</span>
                  </button>
                  <button
                    type="button"
                    className={`qb-note-view-tab${editorMode === "preview" ? " is-active" : ""}`}
                    onClick={() => setEditorMode("preview")}
                  >
                    <Eye size={13} />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    className={`qb-note-view-tab qb-desktop-only${
                      editorMode === "split" ? " is-active" : ""
                    }`}
                    onClick={() => setEditorMode("split")}
                  >
                    <Columns size={13} />
                    <span>Split</span>
                  </button>
                </div>
              </div>

              {/* Editor Content Area */}
              <div className={`qb-note-content-area is-${editorMode}`}>
                {(editorMode === "write" || editorMode === "split") && (
                  <div className="qb-note-editor-wrapper">
                    <textarea
                      ref={textareaRef}
                      className="qb-note-textarea"
                      placeholder="Write your study notes, formulas, memory tricks, or checklist here. Markdown and LaTeX math ($...$) are supported..."
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  </div>
                )}

                {(editorMode === "preview" || editorMode === "split") && (
                  <div className="qb-note-preview-wrapper">
                    {editContent.trim() ? (
                      <MarkdownText text={editContent} />
                    ) : (
                      <div className="qb-note-preview-empty">
                        <Sparkles size={28} />
                        <p>Preview will appear here as you write Markdown and math formulas.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Editor Footer: Word Count & Help */}
              <div className="qb-note-editor-footer">
                <span className="qb-note-stats-text">
                  {editContent.trim() ? editContent.trim().split(/\s+/).length : 0} words ·{" "}
                  {editContent.length} characters
                </span>
                <span className="qb-note-math-hint">
                  Tip: Use <code>$a^2 + b^2 = c^2$</code> for math and <code>- [ ]</code> for checklists.
                </span>
              </div>
            </div>
          ) : (
            /* No Active Note Selected Placeholder */
            <div className="qb-notes-no-selection">
              <div className="qb-notes-no-sel-card">
                <div className="qb-notes-no-sel-icon-wrap">
                  <BookOpen size={36} />
                </div>
                <h2>Select a Note or Start a New One</h2>
                <p>
                  Keep all your Civil Service reviewer provisions, mnemonics, math shortcuts, and
                  study plans organized in one fast, responsive place.
                </p>
                <div className="qb-notes-no-sel-actions">
                  <button
                    type="button"
                    className="qb-notes-btn qb-notes-new-btn"
                    onClick={() => startNewNote("general")}
                  >
                    <Plus size={16} />
                    <span>Create New Note</span>
                  </button>
                  <button
                    type="button"
                    className="qb-notes-btn qb-notes-scratch-btn"
                    onClick={() => {
                      startNewNote("strategy");
                      setEditTitle("Exam Day Reminders & Plan");
                      setEditContent(
                        "### Priority Topics to Review Tonight\n- [ ] Philippine Constitution Executive & Legislative powers\n- [ ] Ratio & Proportion formula review\n- [ ] Alphabetical filing with prefixes\n- [ ] RA 6713 gift and outside employment prohibitions"
                      );
                    }}
                  >
                    <CheckSquare size={15} />
                    <span>Quick Exam Checklist Template</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
                onClick={() => handleDeleteNote(deleteConfirmId)}
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
