import React, { useState, useRef, useEffect } from "react";
import { TOPICS, SORT_OPTIONS } from "../../constants/appConstants";
import { ClipboardList, ChevronRight, Plus, Star, ChevronDown, Lightbulb, Palette, BookOpen } from "lucide-react";
import MarkdownText from "./MarkdownText";
import usePlainTextCopy from "../../utils/usePlainTextCopy";

// Cards rendered initially / per "Show more" step. Keeps the markdown+KaTeX
// render cost bounded for large result sets instead of rendering every match.
const PAGE_SIZE = 30;

export default function QuestionList({
  questions,
  onSelect,
  onToggleFavorite,
  totalInProject,
  sortBy,
  onSortChange,
  canManageQuestions,
  onAddQuestion,
  onNavigateToTips, // NEW: Navigate to Tips page
  resetKey, // when it changes (search/filter/sort intent), collapse to first page
}) {
  const getTopic = id => TOPICS.find(t => t.id===id) || TOPICS[0];
  const [sortOpen, setSortOpen] = useState(false);
  const [sortDir, setSortDir] = useState("down");
  const sortRef = useRef(null);
  const copyAreaRef = useRef(null);
  usePlainTextCopy(copyAreaRef);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination only on filter/sort/search intent (resetKey change) —
  // NOT when the questions array identity changes (e.g. a favorite toggle),
  // so the user's position in the list is preserved.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [resetKey]);

  const visibleQuestions = questions.slice(0, visibleCount);

  useEffect(() => {
    if (!sortOpen) return;
    const handle = (e) => {
      const root = sortRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setSortOpen(false);
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [sortOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    const handle = (e) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [sortOpen]);

  return (
    <section className="qb-question-section" ref={copyAreaRef}>
      <div className="qb-list-meta">
        <div className="qb-list-meta-left">
          <span className="qb-list-label">Question Feed</span>
          <span className="qb-list-value">
            {visibleCount < questions.length
              ? `${visibleCount} of ${questions.length} shown`
              : `${questions.length} shown`}
          </span>
        </div>
        {canManageQuestions && (
          <button
            type="button"
            className="qb-add-btn qb-list-add-btn"
            onClick={onAddQuestion}
          >
            <Plus size={16} />
            Add Question
          </button>
        )}
        <div className="qb-list-meta-right">
          <div className="qb-sort-wrap">
            <span className="qb-sort-label">Sort</span>
            <div className="qb-select" ref={sortRef} data-dir={sortDir} data-open={sortOpen}>
              <button className="qb-select-btn" type="button" onClick={() => {
                if (!sortOpen && sortRef.current) {
                  const rect = sortRef.current.getBoundingClientRect();
                  setSortDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                }
                setSortOpen(o => !o);
              }} aria-expanded={sortOpen}>
                <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                <ChevronDown size={16} />
              </button>
              <div className={`qb-select-menu${sortOpen ? " open" : ""}`}>
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`qb-select-item${sortBy === option.value ? " on" : ""}`}
                    onClick={() => {
                      onSortChange(option.value);
                      setSortOpen(false);
                    }}
                  >
                    {option.label}
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
              <Lightbulb size={32} />
            </div>
            <div className="qb-tips-promo-text">
              <h3 className="qb-tips-promo-title">Create Study Notes & Visual Diagrams</h3>
              <p className="qb-tips-promo-desc">
                Organize your methods step-by-step! Add text notes or draw visual solutions. 
                Categorize by type (Formula, Shortcut, Method) and track your mastery.
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="qb-tips-promo-btn"
            onClick={onNavigateToTips}
          >
            <BookOpen size={18} />
            Open Tips
          </button>
        </div>
      )}

      <div className="qb-question-stack">
      {questions.length === 0 ? (
        <div className="qb-empty">
          <ClipboardList size={48} className="qb-empty-ico" style={{ margin: "0 auto 14px", opacity: 0.2 }} />
          <div className="qb-empty-t">{totalInProject===0 ? "No questions yet" : "No results found"}</div>
          <div className="qb-empty-s">{totalInProject===0 ? "Add your first CSE question to get started." : "Try adjusting your search or filter."}</div>
        </div>
      ) : (
        visibleQuestions.map((q, i) => {
          const t = getTopic(q.topic);
          return (
            <div key={q.id} className={`qb-qcard${q.favorite ? " qb-qcard-fav" : ""}`} onClick={() => onSelect(q.id)}>
              <div className="qb-qcard-top">
                <div className="qb-qcard-top-left">
                  <span className="qb-qnum">Question {String(i+1).padStart(3,"0")}</span>
                  <span className="qb-badge" style={{ color:t.color, background:`${t.color}20` }}>{t.short}</span>
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
                <span className="qb-qtext"><MarkdownText text={q.question} inline /></span>
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
            Show more ({questions.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </section>
  );
}
