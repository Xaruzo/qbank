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

const renderSortIcon = (val: string, size = 13) => {
  switch (val) {
    case "favorites":
      return <Star size={size} className="qb-sort-star-icon" fill="currentColor" />;
    case "newest":
      return <Clock size={size} />;
    case "oldest":
      return <History size={size} />;
    case "label-a-z":
      return <ArrowDownAZ size={size} />;
    case "label-z-a":
      return <ArrowUpZA size={size} />;
    case "a-z":
      return <SortAsc size={size} />;
    case "z-a":
      return <SortDesc size={size} />;
    default:
      return <ArrowUpDown size={size} />;
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
        <div className="qb-list-meta-right">
          <div className="qb-sort-wrap">
            <span className="qb-sort-label">
              <ArrowUpDown size={12} className="qb-sort-label-icon" aria-hidden="true" />
              <span>Sort</span>
            </span>
            <div className="qb-select" ref={sortRef} data-dir={sortDir} data-open={sortOpen}>
              <button
                className="qb-select-btn"
                type="button"
                onClick={() => {
                  if (!sortOpen && sortRef.current) {
                    const rect = sortRef.current.getBoundingClientRect();
                    setSortDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                  }
                  setSortOpen((o) => !o);
                }}
                aria-expanded={sortOpen}
              >
                <span className="qb-select-btn-lead">
                  {renderSortIcon(sortBy, 14)}
                  <span className="qb-select-btn-text">
                    {SORT_OPTIONS.find((o: { value: string; label: string }) => o.value === sortBy)?.label || "Sort"}
                  </span>
                </span>
                <ChevronDown size={15} className="qb-select-chevron" />
              </button>
              <div className={`qb-select-menu${sortOpen ? " open" : ""}`}>
                {SORT_OPTIONS.map((option: { value: string; label: string }) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`qb-select-item${sortBy === option.value ? " on" : ""}`}
                    onClick={() => {
                      onSortChange(option.value);
                      setSortOpen(false);
                    }}
                  >
                    <span className="qb-select-item-icon-wrap" aria-hidden="true">
                      {renderSortIcon(option.value, 13)}
                    </span>
                    <span className="qb-select-item-label">{option.label}</span>
                  </button>
                ))}
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
