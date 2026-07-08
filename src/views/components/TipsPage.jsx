import React, { useEffect, useMemo, useState } from "react";
import { TOPICS } from "../../constants/appConstants";
import { tipsModel } from "../../models/tipsModel";
import MathText from "./MathText";
import { ChevronLeft, Search } from "lucide-react";

export default function TipsPage({
  questions,
  userId,
  onBack,
  onSelectQuestion,
}) {
  const [tipsMap, setTipsMap] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    tipsModel.getAll(userId).then((map) => {
      if (!active) return;
      setTipsMap(map || {});
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((item) => {
      const label = typeof item.label === "string" ? item.label : "";
      const questionText = typeof item.question === "string" ? item.question : "";
      return `${label} ${questionText}`.toLowerCase().includes(q);
    });
  }, [questions, search]);

  const getTopic = (id) => TOPICS.find((t) => t.id === id) || TOPICS[0];

  return (
    <div className="fu">
      <div className="qb-form-hdr">
        <button className="qb-back" onClick={onBack} style={{ display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} style={{ marginRight: 4 }} />
          Back
        </button>
        <h2 className="qb-form-title">Tips & Tricks</h2>
      </div>

      <section className="qb-question-section" style={{ marginBottom: 14 }}>
        <div className="qb-list-meta">
          <div className="qb-list-meta-left">
            <span className="qb-list-label">Pick a Question</span>
            <span className="qb-list-value">{filteredQuestions.length} shown</span>
          </div>
          <label className="qb-search-box" style={{ maxWidth: 580 }}>
            <span className="qb-search-icon" aria-hidden="true">
              <Search size={18} />
            </span>
            <input
              className="qb-search"
              placeholder="Search by label or question..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="qb-question-stack">
          {filteredQuestions.length === 0 ? (
            <div className="qb-empty">
              <div className="qb-empty-t">No results found</div>
              <div className="qb-empty-s">Try adjusting your search.</div>
            </div>
          ) : (
            filteredQuestions.map((q, i) => {
              const t = getTopic(q.topic);
              const hasTip = !!(tipsMap?.[q.id] && String(tipsMap[q.id]).trim());
              return (
                <div
                  key={q.id}
                  className="qb-qcard"
                  onClick={() => onSelectQuestion(q.id)}
                >
                  <div className="qb-qcard-top">
                    <div className="qb-qcard-top-left">
                      <span className="qb-qnum">Question {String(i + 1).padStart(3, "0")}</span>
                      <span className="qb-badge" style={{ color: t.color, background: `${t.color}20` }}>
                        {t.short}
                      </span>
                    </div>
                  </div>
                  <div className="qb-qcard-body">
                    <div className="qb-qcard-heading">
                      <span className="qb-qcard-label">{q.label || "General Review"}</span>
                    </div>
                    <span className="qb-qtext">
                      <MathText text={q.question} />
                    </span>
                  </div>
                  <div className="qb-qcard-foot">
                    <div className="qb-qcard-meta">
                      <span className="qb-qcard-meta-chip">{t.label}</span>
                      {hasTip && <span className="qb-qcard-meta-chip qb-qcard-meta-chip-fav">Has Tip</span>}
                    </div>
                    <span className="qb-qcard-open">Open Tip</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
