import { useState, useRef, useEffect } from "react";
import { TOPICS, SORT_OPTIONS } from "../../constants/appConstants";
import {
  ClipboardList,
  ChevronRight,
  Plus,
  Star,
  ChevronDown,
  Lightbulb,
  BookOpen,
  ArrowUpDown,
  Clock,
  History,
  ArrowDownAZ,
  ArrowUpZA,
  SortAsc,
  SortDesc,
} from "lucide-react";
import MarkdownText from "./MarkdownText";
import usePlainTextCopy from "../../utils/usePlainTextCopy";
import type { QuestionListProps, TopicDef } from "../../types";

export const SORT_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; iconClass: string }
> = {
  favorites: {
    label: "Favorites First",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.15)",
    iconClass: "qb-sort-icon-favorites",
  },
  newest: {
    label: "Newest First",
    color: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.15)",
    iconClass: "qb-sort-icon-newest",
  },
  oldest: {
    label: "Oldest First",
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.15)",
    iconClass: "qb-sort-icon-oldest",
  },
  "label-a-z": {
    label: "Problem Label A-Z",
    color: "#34d399",
    bg: "rgba(52, 211, 153, 0.15)",
    iconClass: "qb-sort-icon-label-a-z",
  },
  "label-z-a": {
    label: "Problem Label Z-A",
    color: "#2dd4bf",
    bg: "rgba(45, 212, 191, 0.15)",
    iconClass: "qb-sort-icon-label-z-a",
  },
  "a-z": {
    label: "Question A-Z",
    color: "#fb923c",
    bg: "rgba(251, 146, 60, 0.15)",
    iconClass: "qb-sort-icon-a-z",
  },
  "z-a": {
    label: "Question Z-A",
    color: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.15)",
    iconClass: "qb-sort-icon-z-a",
  },
};

const renderSortIcon = (val: string, size = 14) => {
  const meta = SORT_CONFIG[val] || { color: "#38bdf8", iconClass: "qb-sort-icon-newest" };
  const commonProps = {
    size,
    className: `qb-sort-icon ${meta.iconClass}`,
    style: { color: meta.color },
    "data-colored": "true",
  };

  switch (val) {
    case "favorites":
      return <Star {...commonProps} fill="currentColor" />;
    case "newest":
      return <Clock {...commonProps} />;
    case "oldest":
      return <History {...commonProps} />;
    case "label-a-z":
      return <ArrowDownAZ {...commonProps} />;
    case "label-z-a":
      return <ArrowUpZA {...commonProps} />;
    case "a-z":
      return <SortAsc {...commonProps} />;
    case "z-a":
      return <SortDesc {...commonProps} />;
    default:
      return <ArrowUpDown {...commonProps} />;
  }
};

// Cards rendered initially / per "Show more" step.
const PAGE_SIZE = 30;

export default function QuestionList({
  questions,
  onSelect,
  onToggleFavorite,
  totalInProject,
  sortBy,
  onSortChange,
  canManageQuestions = false,
  onAddQuestion,
  onNavigateToTips,
  resetKey,
}: QuestionListProps) {
  const getTopic = (id: string): TopicDef => TOPICS.find((t: TopicDef) => t.id === id) || TOPICS[0];
  const [sortOpen, setSortOpen] = useState(false);
  const [sortDir, setSortDir] = useState<"down" | "up">("down");
  const sortRef = useRef<HTMLDivElement>(null);
  const copyAreaRef = useRef<HTMLElement>(null);
  usePlainTextCopy(copyAreaRef);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination on filter/sort/search intent (resetKey change)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [resetKey]);

  const visibleQuestions = questions.slice(0, visibleCount);

  useEffect(() => {
    if (!sortOpen) return;
    const handle = (e: MouseEvent) => {
      const root = sortRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setSortOpen(false);
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [sortOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [sortOpen]);

  return (
    <section className="qb-question-section" ref={copyAreaRef} id="qb-question-feed">
      <div className="qb-list-meta">
        <div className="qb-list-meta-header-row">
          <div className="qb-list-meta-left">
            <span className="qb-list-label">Question Feed</span>
            <span className="qb-list-value">
              {visibleCount < questions.length
                ? `${visibleCount} of ${questions.length} shown`
                : `${questions.length} shown`}
            </span>
          </div>
          {canManageQuestions && onAddQuestion && (
            <button
              type="button"
              className="qb-add-btn qb-list-add-btn"
              onClick={onAddQuestion}
            >
              <Plus size={15} className="qb-add-btn-icon" />
              <span className="qb-add-btn-text">Add Question</span>
            </button>
          )}
        </div>
        <div className="qb-list-meta-right">
          <div className="qb-sort-wrap">
            <span className="qb-sort-label">
              <ArrowUpDown size={12} className="qb-sort-label-icon" aria-hidden="true" />
              <span>Sort</span>
            </span>
            <div className="qb-select" ref={sortRef} data-dir={sortDir} data-open={sortOpen}>
              <button
                className="qb-select-btn qb-sort-select-btn"
                type="button"
                onClick={() => {
                  if (!sortOpen && sortRef.current) {
                    const rect = sortRef.current.getBoundingClientRect();
                    setSortDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                  }
                  setSortOpen((o) => !o);
                }}
                aria-expanded={sortOpen}
                style={
                  sortBy === "favorites"
                    ? { borderColor: "rgba(245, 158, 11, 0.35)", backgroundColor: "rgba(245, 158, 11, 0.08)" }
                    : undefined
                }
              >
                <span className="qb-select-btn-lead">
                  <span
                    className="qb-select-lead-icon qb-sort-item-icon-wrap"
                    style={{ color: (SORT_CONFIG[sortBy] || { color: "#f59e0b" }).color }}
                    aria-hidden="true"
                  >
                    {renderSortIcon(sortBy, 14)}
                  </span>
                  <span
                    className="qb-select-btn-text"
                    style={sortBy === "favorites" ? { color: "#f59e0b", fontWeight: 600 } : undefined}
                  >
                    {SORT_CONFIG[sortBy]?.label || SORT_OPTIONS.find((o: { value: string; label: string }) => o.value === sortBy)?.label || "Sort"}
                  </span>
                </span>
                <ChevronDown size={15} className={`qb-select-chevron${sortOpen ? " is-open" : ""}`} />
              </button>
              <div className={`qb-select-menu${sortOpen ? " open" : ""}`}>
                {SORT_OPTIONS.map((option: { value: string; label: string }) => {
                  const meta = SORT_CONFIG[option.value] || { color: "var(--text-muted)", bg: "transparent" };
                  const isSelected = sortBy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`qb-select-item qb-sort-select-item${isSelected ? " on" : ""}`}
                      style={
                        isSelected
                          ? { color: meta.color, backgroundColor: meta.bg }
                          : undefined
                      }
                      onClick={() => {
                        onSortChange(option.value);
                        setSortOpen(false);
                      }}
                    >
                      <span
                        className="qb-select-item-icon-wrap qb-sort-item-icon-wrap"
                        style={{ color: meta.color }}
                        aria-hidden="true"
                      >
                        {renderSortIcon(option.value, 14)}
                      </span>
                      <span
                        className="qb-select-item-label"
                        style={isSelected ? { color: meta.color, fontWeight: 600 } : undefined}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Feature Promo Banner */}
      {onNavigateToTips && questions.length > 0 && (
        <div className="qb-tips-promo-banner">
          <div className="qb-tips-promo-content">
            <div className="qb-tips-promo-icon">
              <Lightbulb size={28} />
            </div>
            <div className="qb-tips-promo-text">
              <h3 className="qb-tips-promo-title">Create Study Notes & Visual Diagrams</h3>
              <p className="qb-tips-promo-desc">
                Organize your methods step-by-step. Add text notes or draw visual solutions.
                Categorize by type (Formula, Shortcut, Method) and track your mastery.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="qb-tips-promo-btn"
            onClick={onNavigateToTips}
          >
            <BookOpen size={16} />
            <span>Open Tips</span>
          </button>
        </div>
      )}

      <div className="qb-question-stack" id="qb-question-cards">
        {questions.length === 0 ? (
          <div className="qb-empty">
            <ClipboardList size={48} className="qb-empty-ico" style={{ margin: "0 auto 14px", opacity: 0.2 }} />
            <div className="qb-empty-t">{totalInProject === 0 ? "No questions yet" : "No results found"}</div>
            <div className="qb-empty-s">
              {totalInProject === 0
                ? "Add your first CSE question to get started."
                : "Try adjusting your search or filter."}
            </div>
          </div>
        ) : (
          visibleQuestions.map((q, i) => {
            const t = getTopic(q.topic);
            return (
              <div
                key={q.id}
                className={`qb-qcard${q.favorite ? " qb-qcard-fav" : ""}`}
                onClick={() => onSelect(q.id)}
              >
                <div className="qb-qcard-top">
                  <div className="qb-qcard-top-left">
                    <span className="qb-qnum tabular-nums">Question {String(i + 1).padStart(3, "0")}</span>
                    <span
                      className="qb-badge"
                      style={{ color: t.color, background: `${t.color}20` }}
                    >
                      {t.short || t.label.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`qb-fav-btn${q.favorite ? " on" : ""}`}
                    aria-label={q.favorite ? "Remove from favorites" : "Add to favorites"}
                    title={q.favorite ? "Unfavorite question" : "Favorite question"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(q.id);
                    }}
                  >
                    <Star size={16} className="qb-fav-ico" fill={q.favorite ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="qb-qcard-body">
                  <div className="qb-qcard-heading">
                    <span className="qb-qcard-label">{q.label || "General Review"}</span>
                  </div>
                  <span className="qb-qtext">
                    <MarkdownText text={q.question} inline />
                  </span>
                </div>
                <div className="qb-qcard-foot">
                  <div className="qb-qcard-meta">
                    <span className="qb-qcard-meta-chip">{t.label}</span>
                    {q.favorite && <span className="qb-qcard-meta-chip qb-qcard-meta-chip-fav">Starred</span>}
                  </div>
                  <span className="qb-qcard-open">
                    Open
                    <ChevronRight size={18} className="qb-qarrow" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {visibleCount < questions.length && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 14 }}>
          <button
            type="button"
            className="qb-pill"
            onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, questions.length))}
          >
            Show more (<span className="tabular-nums">{questions.length - visibleCount}</span> remaining)
          </button>
        </div>
      )}
    </section>
  );
}
