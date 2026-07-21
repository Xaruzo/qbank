import React, { useState, useRef, useEffect } from "react";
import { TOPICS, SORT_OPTIONS } from "../../constants/appConstants";
import { ClipboardList, ChevronRight, Lock, LogIn, Plus, Star, ChevronDown } from "lucide-react";
import MarkdownText from "./MarkdownText";

export default function QuestionList({
  questions,
  onSelect,
  onToggleFavorite,
  totalInProject,
  sortBy,
  onSortChange,
  canManageQuestions,
  authAvailable,
  isAuthenticated,
  onAddQuestion,
}) {
  const getTopic = id => TOPICS.find(t => t.id===id) || TOPICS[0];
  const canAdd = canManageQuestions || !authAvailable;
  const needsAuth = authAvailable && !isAuthenticated;
  const isForbidden = authAvailable && isAuthenticated && !canManageQuestions;
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

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
    <section className="qb-question-section">
      <div className="qb-list-meta">
        <div className="qb-list-meta-left">
          <span className="qb-list-label">Question Feed</span>
          <span className="qb-list-value">{questions.length} shown</span>
        </div>
        <button
          type="button"
          className="qb-add-btn qb-list-add-btn"
          onClick={isForbidden ? undefined : onAddQuestion}
          disabled={isForbidden}
        >
          {canAdd ? <Plus size={16} /> : needsAuth ? <LogIn size={16} /> : <Lock size={16} />}
          {canAdd ? "Add Question" : needsAuth ? "Sign In to Add" : "Admin Only"}
        </button>
        <div className="qb-list-meta-right">
          <div className="qb-sort-wrap">
            <span className="qb-sort-label">Sort</span>
            <div className="qb-select" ref={sortRef}>
              <button className="qb-select-btn" type="button" onClick={() => setSortOpen(o => !o)} aria-expanded={sortOpen}>
                <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                <ChevronDown size={16} />
              </button>
              {sortOpen && (
                <div className="qb-select-menu">
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
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="qb-question-stack">
      {questions.length === 0 ? (
        <div className="qb-empty">
          <ClipboardList size={48} className="qb-empty-ico" style={{ margin: "0 auto 14px", opacity: 0.2 }} />
          <div className="qb-empty-t">{totalInProject===0 ? "No questions yet" : "No results found"}</div>
          <div className="qb-empty-s">{totalInProject===0 ? "Add your first CSE question to get started." : "Try adjusting your search or filter."}</div>
        </div>
      ) : (
        questions.map((q, i) => {
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
    </section>
  );
}
