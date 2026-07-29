import React, { useEffect, useMemo, useState } from "react";
import { TOPICS } from "../../constants/appConstants";
import { tipsModel, TIP_CATEGORIES, MASTERY_LEVELS } from "../../models/tipsModel";
import MathText from "./MathText";
import { ChevronLeft, Search, Filter, Palette, FileText, Tag, TrendingUp } from "lucide-react";

export default function TipsPage({
  questions,
  userId,
  onBack,
  onSelectQuestion,
}) {
  const [tipsMap, setTipsMap] = useState({});
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMastery, setFilterMastery] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

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
    let filtered = questions;

    // Text search
    if (q) {
      filtered = filtered.filter((item) => {
        const label = typeof item.label === "string" ? item.label : "";
        const questionText = typeof item.question === "string" ? item.question : "";
        return `${label} ${questionText}`.toLowerCase().includes(q);
      });
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((item) => {
        const tipData = tipsMap?.[item.id];
        if (!tipData) return false;
        const category = typeof tipData === "object" ? tipData.category : "general";
        return category === filterCategory;
      });
    }

    // Mastery filter
    if (filterMastery !== "all") {
      filtered = filtered.filter((item) => {
        const tipData = tipsMap?.[item.id];
        if (!tipData) return false;
        const mastery = typeof tipData === "object" ? tipData.masteryLevel : "learning";
        return mastery === filterMastery;
      });
    }

    return filtered;
  }, [questions, search, tipsMap, filterCategory, filterMastery]);

  const getTopic = (id) => TOPICS.find((t) => t.id === id) || TOPICS[0];

  const activeFiltersCount = (filterCategory !== "all" ? 1 : 0) + (filterMastery !== "all" ? 1 : 0);

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
        <div className="qb-list-meta qb-list-meta-tips">
          <div className="qb-list-meta-left qb-list-meta-left-tips">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="qb-list-label">Pick a Question</span>
              <span className="qb-list-value">{filteredQuestions.length} shown</span>
            </div>
            <button
              className="qb-filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: showFilters ? "var(--accent)" : "var(--surface-h)",
                color: showFilters ? "#fff" : "inherit",
                cursor: "pointer",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <Filter size={16} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
          <label className="qb-search-box qb-tips-search-box">
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

        {/* Filter Panel */}
        {showFilters && (
          <div className="qb-filters-panel" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {/* Category Filter */}
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.85 }}>
                  <Tag size={14} />
                  Category
                </label>
                <select
                  className="qb-finput"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ width: "100%", cursor: "pointer" }}
                >
                  <option value="all">All Categories</option>
                  {Object.values(TIP_CATEGORIES).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Mastery Filter */}
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.85 }}>
                  <TrendingUp size={14} />
                  Mastery Level
                </label>
                <select
                  className="qb-finput"
                  value={filterMastery}
                  onChange={(e) => setFilterMastery(e.target.value)}
                  style={{ width: "100%", cursor: "pointer" }}
                >
                  <option value="all">All Levels</option>
                  {Object.values(MASTERY_LEVELS).map(level => (
                    <option key={level.id} value={level.id}>{level.icon} {level.label}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters Button */}
              {activeFiltersCount > 0 && (
                <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="qb-fcancel"
                    onClick={() => {
                      setFilterCategory("all");
                      setFilterMastery("all");
                    }}
                    style={{ padding: "8px 16px" }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="qb-question-stack">
          {filteredQuestions.length === 0 ? (
            <div className="qb-empty">
              <div className="qb-empty-t">No results found</div>
              <div className="qb-empty-s">Try adjusting your search.</div>
            </div>
          ) : (
            filteredQuestions.map((q, i) => {
              const t = getTopic(q.topic);
              const tipData = tipsMap?.[q.id];
              const hasTip = !!(tipData && (
                (typeof tipData === "string" && tipData.trim()) ||
                (typeof tipData === "object" && (tipData.text?.trim() || tipData.canvasData))
              ));
              const hasCanvas = !!(tipData && typeof tipData === "object" && tipData.canvasData);
              const hasText = !!(tipData && (
                (typeof tipData === "string" && tipData.trim()) ||
                (typeof tipData === "object" && tipData.text?.trim())
              ));
              const category = tipData && typeof tipData === "object" ? tipData.category : "general";
              const categoryInfo = Object.values(TIP_CATEGORIES).find(c => c.id === category) || TIP_CATEGORIES.GENERAL;
              const mastery = tipData && typeof tipData === "object" ? tipData.masteryLevel : "learning";
              const masteryInfo = Object.values(MASTERY_LEVELS).find(m => m.id === mastery) || MASTERY_LEVELS.LEARNING;

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
                      {hasTip && (
                        <>
                          <span
                            className="qb-tip-badge"
                            style={{
                              background: `${categoryInfo.color}20`,
                              color: categoryInfo.color,
                              border: `1px solid ${categoryInfo.color}40`,
                            }}
                            title={categoryInfo.label}
                          >
                            <Tag size={12} />
                            {categoryInfo.label}
                          </span>
                          <span
                            className="qb-tip-badge"
                            style={{
                              background: `${masteryInfo.color}20`,
                              color: masteryInfo.color,
                              border: `1px solid ${masteryInfo.color}40`,
                            }}
                            title={masteryInfo.label}
                          >
                            <span style={{ fontSize: 11 }}>{masteryInfo.icon}</span>
                            {masteryInfo.label}
                          </span>
                          {hasText && (
                            <span
                              className="qb-tip-badge"
                              style={{
                                background: "#3b82f620",
                                color: "#3b82f6",
                                border: "1px solid #3b82f640",
                              }}
                              title="Has text notes"
                            >
                              <FileText size={12} />
                              Notes
                            </span>
                          )}
                          {hasCanvas && (
                            <span
                              className="qb-tip-badge"
                              style={{
                                background: "#8b5cf620",
                                color: "#8b5cf6",
                                border: "1px solid #8b5cf640",
                              }}
                              title="Has visual diagram"
                            >
                              <Palette size={12} />
                              Diagram
                            </span>
                          )}
                        </>
                      )}
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
