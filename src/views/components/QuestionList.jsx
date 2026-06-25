import React from "react";
import { TOPICS, SORT_OPTIONS } from "../../constants/appConstants";
import { ClipboardList, ChevronRight, LogIn, Plus, Star } from "lucide-react";
import MathText from "./MathText";

export default function QuestionList({
  questions,
  onSelect,
  onToggleFavorite,
  totalInProject,
  sortBy,
  onSortChange,
  canManageQuestions,
  authAvailable,
  onAddQuestion,
}) {
  const getTopic = id => TOPICS.find(t => t.id===id) || TOPICS[0];

  return (
    <>
      <div className="qb-list-meta">
        <div className="qb-list-meta-left">
          <span className="qb-list-label">Questions</span>
          <span className="qb-list-label">{questions.length} shown</span>
        </div>
        <button type="button" className="qb-add-btn qb-list-add-btn" onClick={onAddQuestion}>
          {canManageQuestions || !authAvailable ? <Plus size={16} /> : <LogIn size={16} />}
          {canManageQuestions || !authAvailable ? "Add Question" : "Sign In to Add"}
        </button>
        <div className="qb-list-meta-right">
          <label className="qb-sort-wrap">
            <span className="qb-sort-label">Sort</span>
            <select className="qb-sort" value={sortBy} onChange={e => onSortChange(e.target.value)}>
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {questions.length === 0 ? (
        <div className="qb-empty">
          <ClipboardList size={48} className="qb-empty-ico" style={{ margin: "0 auto 14px", opacity: 0.2 }} />
          <div className="qb-empty-t">{totalInProject===0 ? "No questions yet" : "No results found"}</div>
          <div className="qb-empty-s">{totalInProject===0 ? "Add your first CSE question to get started." : "Try adjusting your search or filter."}</div>
        </div>
      ) : (
        questions.map((q, i) => {
          const t = getTopic(q.topic);
          const label = typeof q.label === "string" ? q.label.trim() : "";
          return (
            <div key={q.id} className={`qb-qcard${q.favorite ? " qb-qcard-fav" : ""}`} onClick={() => onSelect(q.id)}>
              <span className="qb-qnum">#{String(i+1).padStart(3,"0")}</span>
              <div className="qb-qmeta-badges">
                <span className="qb-badge" style={{ color:t.color, background:`${t.color}20` }}>{t.short}</span>
                {label && <span className="qb-badge qb-badge-neutral">{label}</span>}
              </div>
              <span className="qb-qtext"><MathText text={q.question} /></span>
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
              <ChevronRight size={18} className="qb-qarrow" />
            </div>
          );
        })
      )}
    </>
  );
}
