import React from "react";
import { TOPICS, SORT_OPTIONS } from "../../constants/appConstants";
import { ClipboardList, ChevronRight, Lock, LogIn, Plus, Star } from "lucide-react";
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
          <label className="qb-sort-wrap">
            <span className="qb-sort-label">Sort</span>
            <div className="qb-sort-input-wrap">
              <select className="qb-sort" value={sortBy} onChange={e => { onSortChange(e.target.value); setTimeout(() => e.target.blur(), 0); }} onMouseDown={e => { if (document.activeElement === e.target) setTimeout(() => e.target.blur(), 0); }}>
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
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
