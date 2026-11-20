import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { TOPICS, SORT_OPTIONS } from "../../constants/appConstants";
import {
  ClipboardList,
  ChevronRight,
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
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import MarkdownText from "./MarkdownText";
import usePlainTextCopy from "../../utils/usePlainTextCopy";
import { computeSelectPlacement } from "../../utils/selectPlacement";
import ModernAddIcon from "./ModernAddIcon";
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
  masteryMap = {},
  canManageQuestions = false,
  onAddQuestion,
  onNavigateToTips,
  resetKey,
}: QuestionListProps) {
  const getTopic = (id: string): TopicDef => TOPICS.find((t: TopicDef) => t.id === id) || TOPICS[0];
  const [sortOpen, setSortOpen] = useState(false);
  const [sortDir, setSortDir] = useState<"down" | "up">("down");
  const [sortMaxH, setSortMaxH] = useState(312);
  const sortRef = useRef<HTMLDivElement>(null);
  const copyAreaRef = useRef<HTMLElement>(null);
  usePlainTextCopy(copyAreaRef);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const metaBarRef = useRef<HTMLDivElement>(null);
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);

  // Monitor when meta bar scrolls out of view to gracefully reveal floating docked action
  useEffect(() => {
    if (!canManageQuestions || !onAddQuestion) return;
    const target = metaBarRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingAdd(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [canManageQuestions, onAddQuestion]);

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

  useLayoutEffect(() => {
    if (!sortOpen) return;
    const sync = () => {
      const next = computeSelectPlacement(sortRef.current);
      setSortDir(next.dir);
      setSortMaxH(next.maxHeight);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [sortOpen]);

  return (
    <section className="space-y-4" ref={copyAreaRef} id="qb-question-feed">
      {/* Structured Question Feed Header Toolbar */}
      <div
        ref={metaBarRef}
        className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex sm:flex-row sm:items-center sm:justify-between items-center gap-x-3 gap-y-2.5 rounded-2xl border border-qb-border bg-qb-surface px-3.5 py-3 sm:px-4 sm:py-3.5"
      >
        <div className="col-start-1 row-start-1 flex flex-col sm:flex-row sm:flex-wrap sm:items-baseline gap-x-2.5 gap-y-0.5 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
            Question Feed
          </span>
          <span className="hidden sm:inline text-qb-muted" aria-hidden="true">·</span>
          <span className="text-sm font-semibold text-qb-heading tabular-nums truncate">
            {visibleCount < questions.length
              ? `${visibleCount} of ${questions.length} shown`
              : `${questions.length} ${questions.length === 1 ? "item" : "items"} shown`}
          </span>
        </div>

        <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto sm:ml-auto flex items-center sm:justify-end gap-2.5 min-w-0">
          <div className="qb-sort-wrap flex items-center gap-2 w-full sm:w-auto min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted shrink-0">
              <ArrowUpDown size={12} aria-hidden="true" />
              <span>Sort</span>
            </span>
            <div
              className="qb-select flex-1 min-w-0 sm:flex-initial sm:!min-w-[230px]"
              ref={sortRef}
              data-dir={sortDir}
              data-open={sortOpen}
            >
              <button
                className="qb-select-btn qb-sort-select-btn !min-h-[38px] !w-full !min-w-0 sm:!min-w-[230px] !rounded-xl"
                type="button"
                onClick={() => {
                  if (!sortOpen && sortRef.current) {
                    const next = computeSelectPlacement(sortRef.current);
                    setSortDir(next.dir);
                    setSortMaxH(next.maxHeight);
                  }
                  setSortOpen((o) => !o);
                }}
                aria-expanded={sortOpen}
                style={
                  sortBy === "favorites"
                    ? { borderColor: "rgba(245, 158, 11, 0.45)", backgroundColor: "rgba(245, 158, 11, 0.1)" }
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
                    {SORT_CONFIG[sortBy]?.label ||
                      SORT_OPTIONS.find((o: { value: string; label: string }) => o.value === sortBy)?.label ||
                      "Sort"}
                  </span>
                </span>
                <ChevronDown size={15} className={`qb-select-chevron${sortOpen ? " is-open" : ""}`} />
              </button>
              <div className={`qb-select-menu${sortOpen ? " open" : ""}`}>
                <div className="qb-select-menu-scroll" style={{ maxHeight: `${sortMaxH}px` }}>
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

        {canManageQuestions && onAddQuestion && (
          <button
            type="button"
            onClick={onAddQuestion}
            title="Add Question to Reviewer Bank"
            className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto inline-flex h-[36px] sm:h-[38px] items-center gap-1.5 sm:gap-2 rounded-xl bg-amber-500 px-3 sm:px-3.5 text-xs font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer shrink-0 justify-self-end"
          >
            <ModernAddIcon size={15} className="shrink-0" />
            <span>Add Question</span>
          </button>
        )}
      </div>

      {/* Compact Study Notes & Visual Diagrams Callout */}
      {onNavigateToTips && questions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-500/25 light:border-amber-600/25 bg-amber-500/[0.06] light:bg-amber-50/75 px-4 py-3.5">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400 light:border-amber-600/25 light:text-amber-700">
              <Lightbulb size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-qb-heading leading-snug">
                Create Study Notes & Visual Diagrams
              </h3>
              <p className="mt-0.5 text-xs text-qb-mid leading-relaxed">
                Organize formulas, shortcuts, and step-by-step visual solutions across every question.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToTips}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500 px-3.5 text-xs font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer"
          >
            <BookOpen size={14} aria-hidden="true" />
            <span>Open Tips</span>
          </button>
        </div>
      )}

      {/* Responsive 2-Column Bento Question Cards Grid */}
      <div
        className={
          questions.length === 0
            ? "block"
            : "grid grid-cols-1 lg:grid-cols-2 gap-3.5"
        }
        id="qb-question-cards"
      >
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-qb-border bg-qb-surface px-6 py-14 text-center">
            <ClipboardList size={40} className="mb-3 text-qb-muted opacity-40" aria-hidden="true" />
            <div className="text-base font-bold text-qb-heading">
              {totalInProject === 0 ? "No questions yet" : "No matching questions found"}
            </div>
            <div className="mt-1 max-w-md text-xs sm:text-sm text-qb-muted">
              {totalInProject === 0
                ? "Add your first Civil Service Exam practice question to get started."
                : "Try adjusting your keyword search, subject selection, or progress filters."}
            </div>
          </div>
        ) : (
          visibleQuestions.map((q, i) => {
            const t = getTopic(q.topic);
            const attempt = masteryMap?.[q.id];
            const isMissed = Boolean(attempt?.attempts && attempt.lastResult === "wrong");
            const isMastered = Boolean(attempt?.attempts && attempt.lastResult !== "wrong");

            return (
              <div
                key={q.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(q.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(q.id);
                  }
                }}
                className={`group relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border p-4 sm:p-5 text-left transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${
                  q.favorite
                    ? "border-amber-500/45 bg-qb-surface hover:border-amber-500/70 hover:bg-qb-surface-hover light:border-amber-600/45"
                    : "border-qb-border bg-qb-surface hover:border-qb-border-hover hover:bg-qb-surface-hover"
                }`}
              >
                {/* Card Header: Index + Topic + Favorite Toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-semibold text-qb-muted tabular-nums">
                      #{String(i + 1).padStart(3, "0")}
                    </span>
                    <span className="text-qb-muted/50" aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold truncate" style={{ color: t.color }}>
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{t.label}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label={q.favorite ? "Remove from favorites" : "Add to favorites"}
                    title={q.favorite ? "Unfavorite question" : "Favorite question"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(q.id);
                    }}
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                      q.favorite
                        ? "border-amber-500/45 bg-amber-500/15 text-amber-400 light:border-amber-600/40 light:text-amber-700"
                        : "border-qb-border bg-qb-input text-qb-muted hover:border-qb-border-hover hover:text-amber-400 light:hover:text-amber-700"
                    }`}
                  >
                    <Star size={14} fill={q.favorite ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* Card Body: Label & Question Stem */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="text-xs font-bold tracking-wide text-qb-heading">
                    {q.label || "General Review"}
                  </div>
                  <div className="text-[14px] leading-relaxed text-qb-mid line-clamp-3 break-words">
                    <MarkdownText text={q.question} inline />
                  </div>
                </div>

                {/* Card Footer: Inline Status & Open Affordance */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-qb-border/70 text-xs">
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {q.favorite && (
                      <span className="font-semibold text-amber-400 light:text-amber-700">
                        Starred
                      </span>
                    )}
                    {q.favorite && (isMissed || isMastered) && (
                      <span className="text-qb-muted" aria-hidden="true">·</span>
                    )}
                    {isMissed && (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-400 light:text-rose-700">
                        <AlertCircle size={12} aria-hidden="true" />
                        <span>Missed</span>
                      </span>
                    )}
                    {isMastered && (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 light:text-emerald-700">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        <span>Mastered</span>
                      </span>
                    )}
                    {!q.favorite && !isMissed && !isMastered && (
                      <span className="text-qb-muted">Unseen</span>
                    )}
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 font-bold text-qb-mid transition-colors group-hover:text-qb-accent">
                    <span>Open</span>
                    <ChevronRight
                      size={15}
                      className="transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {visibleCount < questions.length && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, questions.length))}
            className="inline-flex items-center gap-2 rounded-xl border border-qb-border bg-qb-surface px-5 py-2.5 text-xs font-bold text-qb-heading transition-colors hover:border-amber-500/45 hover:bg-qb-surface-hover cursor-pointer"
          >
            <span>
              Show more (<span className="tabular-nums">{questions.length - visibleCount}</span> remaining)
            </span>
          </button>
        </div>
      )}

      {/* Floating Docked Add Action */}
      {canManageQuestions &&
        onAddQuestion &&
        typeof document !== "undefined" &&
        createPortal(
          <button
            type="button"
            className={`qb-floating-docked-add-btn${showFloatingAdd ? " is-visible" : ""}`}
            onClick={onAddQuestion}
            title="Add Question (docked action)"
            aria-label="Add Question to Reviewer Bank"
          >
            <ModernAddIcon size={18} className="qb-floating-add-icon" />
            <span className="qb-floating-add-text">Add Question</span>
          </button>,
          document.body
        )}
    </section>
  );
}
